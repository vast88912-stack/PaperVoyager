import React, { useState, useMemo, useEffect } from 'react';
import { Target, Activity, Cpu, X, Zap, SlidersHorizontal, BarChart2 } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

// --- Helper Functions ---
interface Point {
  x: number;
  y: number;
}

const getManhattan = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const getEuclidean = (a: Point, b: Point) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

// Bresenham's line algorithm to simulate a path from hover to goal
const getLinePath = (p0: Point, p1: Point): Point[] => {
  let { x: x0, y: y0 } = p0;
  const { x: x1, y: y1 } = p1;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  const path: Point[] = [];

  // Failsafe limit to prevent infinite loops in edge cases
  let iter = 0;
  while (iter < 100) {
    path.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
    iter++;
  }
  return path;
};

// --- Main Component ---
export default function App() {
  const [algorithm, setAlgorithm] = useState<'A*' | 'Dijkstra' | 'BFS'>('A*');
  const [goalNode, setGoalNode] = useState<Point>({ x: 8, y: 8 });
  const [hoverNode, setHoverNode] = useState<Point>({ x: 2, y: 2 });
  const [gridSize] = useState({ w: 12, h: 12 });
  const [isChartAnimated, setIsChartAnimated] = useState(false);

  // Trigger brief chart animation on load
  useEffect(() => {
    setIsChartAnimated(true);
    const t = setTimeout(() => setIsChartAnimated(false), 800);
    return () => clearTimeout(t);
  }, [algorithm]);

  // Derived Data for the Inspector
  const path = useMemo(() => getLinePath(hoverNode, goalNode), [hoverNode, goalNode]);
  const chartData = useMemo(() => {
    return path.map((pt, idx) => ({
      step: `Step ${idx}`,
      manhattan: parseFloat(getManhattan(pt, goalNode).toFixed(2)),
      euclidean: parseFloat(getEuclidean(pt, goalNode).toFixed(2)),
    }));
  }, [path, goalNode]);

  const currentManhattan = getManhattan(hoverNode, goalNode);
  const currentEuclidean = getEuclidean(hoverNode, goalNode);
  const costDiff = currentManhattan - currentEuclidean;

  // Custom Tooltip for the Recharts component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 border border-cyan-500/30 p-3 rounded shadow-[0_0_15px_rgba(6,182,212,0.2)] backdrop-blur-md">
          <p className="text-slate-300 text-xs font-mono mb-2 uppercase tracking-wider">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm font-mono mb-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color, boxShadow: `0 0 5px ${entry.color}` }}
              />
              <span className="text-slate-400 w-20">{entry.name}:</span>
              <span className="text-white font-bold">{entry.value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 p-6 font-sans selection:bg-cyan-900 relative overflow-hidden flex flex-col items-center justify-center">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-6xl flex flex-col gap-6">
        
        {/* Header & Controls */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-950 border border-cyan-500/30 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Activity className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white uppercase flex items-center gap-2">
                Pathfinding <span className="text-cyan-400">Playground</span>
              </h1>
              <p className="text-xs text-slate-400 font-mono tracking-widest mt-1">MODULE: HEURISTIC_INSPECTOR</p>
            </div>
          </div>

          <div className="flex gap-2 mt-4 md:mt-0 p-1 bg-white/5 rounded-lg border border-white/10 backdrop-blur-md">
            {['A*', 'Dijkstra', 'BFS'].map((algo) => (
              <button
                key={algo}
                onClick={() => setAlgorithm(algo as any)}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-300 ${
                  algorithm === algo
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {algo}
              </button>
            ))}
          </div>
        </header>

        {/* Dynamic Content Area */}
        {algorithm !== 'A*' ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-sm">
            <Cpu className="w-16 h-16 text-slate-600 mb-4" />
            <h2 className="text-xl font-bold text-slate-400">Heuristics Disabled</h2>
            <p className="text-slate-500 text-sm mt-2 max-w-md text-center">
              The {algorithm} algorithm explores uniformly and does not utilize a heuristic function (H-Cost). Switch to <strong className="text-cyan-400">A*</strong> to inspect heuristic behaviors.
            </p>
            <button
              onClick={() => setAlgorithm('A*')}
              className="mt-6 px-6 py-2 bg-cyan-950/50 text-cyan-400 border border-cyan-500/30 rounded-full hover:bg-cyan-900/50 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] font-mono text-sm uppercase tracking-wider"
            >
              Enable A*
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT PANEL: Interactive Grid Projection */}
            <div className="lg:col-span-5 bg-black/40 border border-white/10 p-6 rounded-2xl backdrop-blur-md flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Spatial Projection
                </h3>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20">
                  INTERACTIVE
                </span>
              </div>

              <div className="relative aspect-square w-full max-w-sm mx-auto bg-slate-900 border border-slate-700 rounded-lg overflow-hidden grid"
                   style={{ 
                     gridTemplateColumns: `repeat(${gridSize.w}, minmax(0, 1fr))`,
                     gridTemplateRows: `repeat(${gridSize.h}, minmax(0, 1fr))`
                   }}>
                {Array.from({ length: gridSize.h }).map((_, y) => (
                  Array.from({ length: gridSize.w }).map((_, x) => {
                    const isGoal = x === goalNode.x && y === goalNode.y;
                    const isHover = x === hoverNode.x && y === hoverNode.y;
                    const isInPath = path.some(p => p.x === x && p.y === y);

                    let cellClass = "border-[0.5px] border-slate-800/50 transition-all duration-75 cursor-crosshair ";
                    if (isGoal) cellClass += "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] z-10 animate-pulse ";
                    else if (isHover) cellClass += "bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] z-10 ";
                    else if (isInPath) cellClass += "bg-cyan-900/40 ";
                    else cellClass += "hover:bg-slate-800 ";

                    return (
                      <div
                        key={`${x}-${y}`}
                        className={cellClass}
                        onMouseEnter={() => setHoverNode({ x, y })}
                        onClick={() => setGoalNode({ x, y })}
                      />
                    );
                  })
                ))}
                
                {/* SVG Overlay for the simulated path line */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox={`0 0 ${gridSize.w} ${gridSize.h}`}>
                  <polyline
                    points={path.map(p => `${p.x + 0.5},${p.y + 0.5}`).join(' ')}
                    fill="none"
                    stroke="rgba(236, 72, 153, 0.5)" // fuchsia-500
                    strokeWidth="0.1"
                    strokeDasharray="0.2 0.2"
                    className="animate-[dash_1s_linear_infinite]"
                  />
                </svg>
              </div>

              <div className="mt-6 flex justify-between items-center text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-sm shadow-[0_0_5px_rgba(16,185,129,0.5)]" /> Goal Node (Click to set)
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-cyan-400 rounded-sm shadow-[0_0_5px_rgba(6,182,212,0.5)]" /> Eval Node (Hover)
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Charts & Data Readout */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              
              {/* HUD Readouts */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-black/40 border border-cyan-500/20 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-slate-400 text-xs font-mono uppercase tracking-widest flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3" /> Manhattan
                  </span>
                  <div className="mt-2 text-3xl font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
                    {currentManhattan.toFixed(1)}
                  </div>
                  <div className="mt-1 text-[10px] text-cyan-500/70 font-mono">D1 * (dx + dy)</div>
                </div>

                <div className="bg-black/40 border border-fuchsia-500/20 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-slate-400 text-xs font-mono uppercase tracking-widest flex items-center gap-1">
                    <Target className="w-3 h-3" /> Euclidean
                  </span>
                  <div className="mt-2 text-3xl font-black text-fuchsia-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]">
                    {currentEuclidean.toFixed(1)}
                  </div>
                  <div className="mt-1 text-[10px] text-fuchsia-500/70 font-mono">sqrt(dx² + dy²)</div>
                </div>

                <div className="col-span-2 md:col-span-1 bg-black/40 border border-white/10 p-4 rounded-xl flex flex-col justify-between relative">
                  <span className="text-slate-400 text-xs font-mono uppercase tracking-widest">
                    Delta (M - E)
                  </span>
                  <div className={`mt-2 text-3xl font-black ${costDiff > 0 ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-slate-500'}`}>
                    +{costDiff.toFixed(1)}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500 font-mono line-clamp-1">
                    Admissibility gap
                  </div>
                </div>
              </div>

              {/* Chart Component */}
              <div className="bg-black/40 border border-white/10 p-6 rounded-2xl backdrop-blur-md flex-1 min-h-[300px] shadow-2xl relative">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-indigo-400" />
                    Heuristic Decay Curve
                  </h3>
                  <div className="text-xs text-slate-500 font-mono text-right">
                    Cost progression along simulated path
                  </div>
                </div>
                
                <div className={`w-full h-64 transition-opacity duration-500 ${isChartAnimated ? 'opacity-0' : 'opacity-100'}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <filter id="glow-cyan">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                        <filter id="glow-fuchsia">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis 
                        dataKey="step" 
                        stroke="rgba(255,255,255,0.2)" 
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="rgba(255,255,255,0.2)" 
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        iconType="circle" 
                        wrapperStyle={{ fontSize: '12px', fontFamily: 'monospace', color: '#94a3b8' }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="manhattan" 
                        name="Manhattan" 
                        stroke="#06b6d4" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#050505', stroke: '#06b6d4', strokeWidth: 2 }} 
                        activeDot={{ r: 6, fill: '#06b6d4', stroke: '#fff' }}
                        filter="url(#glow-cyan)"
                        animationDuration={500}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="euclidean" 
                        name="Euclidean" 
                        stroke="#ec4899" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#050505', stroke: '#ec4899', strokeWidth: 2 }} 
                        activeDot={{ r: 6, fill: '#ec4899', stroke: '#fff' }}
                        filter="url(#glow-fuchsia)"
                        animationDuration={500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dash {
          to { stroke-dashoffset: -0.4; }
        }
      `}} />
    </div>
  );
}