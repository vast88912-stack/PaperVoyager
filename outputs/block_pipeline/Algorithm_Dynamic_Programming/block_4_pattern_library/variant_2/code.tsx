import React, { useState, useEffect } from 'react';

// --- DATA MODELS ---

type PatternType = 'line' | 'grid' | 'subsequence' | 'interval';

interface DPPattern {
  id: PatternType;
  name: string;
  shortDesc: string;
  longDesc: string;
  stateDef: string;
  transition: string;
  examples: string[];
}

const PATTERNS: DPPattern[] = [
  {
    id: 'line',
    name: '1D / Line',
    shortDesc: 'State depends on a few previous sequential states.',
    longDesc: 'The simplest DP pattern. The problem can be broken down into a linear sequence of subproblems. You build the solution iteratively from the first element to the last.',
    stateDef: 'dp[i] = optimal solution for prefix of length i',
    transition: 'dp[i] = f(dp[i-1], dp[i-2], ...)',
    examples: ['Fibonacci Sequence', 'Climbing Stairs', 'House Robber']
  },
  {
    id: 'grid',
    name: '2D / Grid',
    shortDesc: 'State depends on top/left neighbors in a matrix.',
    longDesc: 'Used when navigating a 2D space or comparing two linear sequences. The state at any cell is derived from adjacent cells that have already been computed (typically top and left).',
    stateDef: 'dp[i][j] = optimal solution at grid position (i, j)',
    transition: 'dp[i][j] = f(dp[i-1][j], dp[i][j-1]) + cost[i][j]',
    examples: ['Unique Paths', 'Minimum Path Sum', 'Dungeon Game']
  },
  {
    id: 'subsequence',
    name: 'Subsequence',
    shortDesc: 'State tracks elements picked from two sequences.',
    longDesc: 'Focuses on finding optimal subsequences (not necessarily contiguous) within one or between two arrays/strings. Often involves pointers tracking the end of prefixes being compared.',
    stateDef: 'dp[i][j] = optimal solution for seq1[0..i] and seq2[0..j]',
    transition: 'If match: dp[i-1][j-1] + 1\nElse: max(dp[i-1][j], dp[i][j-1])',
    examples: ['Longest Common Subsequence', 'Longest Increasing Subsequence', 'Edit Distance']
  },
  {
    id: 'interval',
    name: 'Interval',
    shortDesc: 'State represents a contiguous range [i, j].',
    longDesc: 'Used when the solution to an interval [i, j] depends on splitting the interval at some point k, and combining the optimal solutions of [i, k] and [k+1, j]. Processing is done by interval length.',
    stateDef: 'dp[i][j] = optimal solution for subarray from index i to j',
    transition: 'dp[i][j] = min_{i <= k < j}(dp[i][k] + dp[k+1][j] + cost)',
    examples: ['Matrix Chain Multiplication', 'Burst Balloons', 'Longest Palindromic Subsequence']
  }
];

// --- SVG DIAGRAM COMPONENTS ---

const ArrowMarker = () => (
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#4f46e5" />
    </marker>
  </defs>
);

const LineDiagram = ({ step }: { step: number }) => {
  const nodes = [0, 1, 2, 3, 4, 5];
  const activeNode = step % 6;

  return (
    <svg viewBox="0 0 400 150" className="w-full h-full text-slate-400">
      <ArrowMarker />
      {nodes.map((n) => (
        <g key={n} transform={`translate(${n * 60 + 50}, 75)`}>
          <circle 
            cx="0" cy="0" r="16" 
            className={`transition-colors duration-300 ${
              n === activeNode ? 'fill-indigo-500 stroke-indigo-600' : 
              n < activeNode ? 'fill-emerald-100 stroke-emerald-500' : 'fill-slate-100 stroke-slate-300'
            } stroke-2`} 
          />
          <text x="0" y="5" textAnchor="middle" className="text-xs font-mono fill-current font-bold" 
                fill={n === activeNode ? 'white' : n < activeNode ? '#059669' : '#94a3b8'}>
            {n}
          </text>
        </g>
      ))}
      {nodes.map((n) => {
        if (n >= nodes.length - 1) return null;
        const isActive = n + 1 === activeNode;
        const isComputed = n + 1 < activeNode;
        return (
          <path 
            key={`edge-${n}`}
            d={`M ${n * 60 + 66} 75 L ${(n + 1) * 60 + 34} 75`}
            stroke={isActive ? '#4f46e5' : isComputed ? '#10b981' : 'currentColor'}
            strokeWidth="2"
            markerEnd={isActive ? 'url(#arrow-blue)' : 'url(#arrow)'}
            className="transition-colors duration-300"
          />
        );
      })}
      {/* Jump edge example */}
      {activeNode >= 2 && (
        <path 
          d={`M ${(activeNode - 2) * 60 + 50} 59 Q ${(activeNode - 1) * 60 + 50} 20 ${activeNode * 60 + 45} 55`}
          fill="none"
          stroke="#4f46e5"
          strokeWidth="2"
          strokeDasharray="4 2"
          markerEnd="url(#arrow-blue)"
          className="animate-pulse"
        />
      )}
    </svg>
  );
};

const GridDiagram = ({ step }: { step: number }) => {
  const size = 4;
  const totalCells = size * size;
  const currentCell = step % totalCells;
  const cx = currentCell % size;
  const cy = Math.floor(currentCell / size);

  return (
    <svg viewBox="0 0 400 250" className="w-full h-full text-slate-300">
      <ArrowMarker />
      <g transform="translate(100, 25)">
        {Array.from({ length: size }).map((_, y) => 
          Array.from({ length: size }).map((_, x) => {
            const isCurrent = x === cx && y === cy;
            const isComputed = y * size + x < currentCell;
            const isDepTop = isCurrent && y > 0;
            const isDepLeft = isCurrent && x > 0;

            return (
              <g key={`${x}-${y}`} transform={`translate(${x * 50}, ${y * 50})`}>
                <rect 
                  x="0" y="0" width="40" height="40" rx="4"
                  className={`transition-colors duration-300 stroke-2 ${
                    isCurrent ? 'fill-indigo-500 stroke-indigo-600' : 
                    isComputed ? 'fill-emerald-100 stroke-emerald-400' : 'fill-slate-50 stroke-slate-200'
                  }`}
                />
                <text x="20" y="25" textAnchor="middle" className="text-[10px] font-mono"
                  fill={isCurrent ? 'white' : isComputed ? '#059669' : '#cbd5e1'}>
                  {x},{y}
                </text>
                {/* Dependency Arrows */}
                {isDepTop && (
                  <path d="M 20 -10 L 20 -2" stroke="#4f46e5" strokeWidth="2" markerEnd="url(#arrow-blue)" />
                )}
                {isDepLeft && (
                  <path d="M -10 20 L -2 20" stroke="#4f46e5" strokeWidth="2" markerEnd="url(#arrow-blue)" />
                )}
              </g>
            );
          })
        )}
      </g>
    </svg>
  );
};

const SubsequenceDiagram = ({ step }: { step: number }) => {
  const seq1 = ['A', 'B', 'C', 'D', 'E'];
  const seq2 = ['A', 'C', 'D', 'F', 'E'];
  const maxSteps = seq1.length;
  const activeStep = step % (maxSteps + 2);

  return (
    <svg viewBox="0 0 400 200" className="w-full h-full text-slate-400">
      <g transform="translate(50, 50)">
        {seq1.map((char, i) => (
          <g key={`s1-${i}`} transform={`translate(${i * 60}, 0)`}>
            <rect x="0" y="0" width="40" height="40" rx="4" 
              className={`stroke-2 ${i < activeStep ? 'fill-indigo-100 stroke-indigo-400' : 'fill-slate-50 stroke-slate-200'}`} />
            <text x="20" y="25" textAnchor="middle" className="font-mono font-bold fill-slate-700">{char}</text>
          </g>
        ))}
      </g>
      <g transform="translate(50, 130)">
        {seq2.map((char, i) => (
          <g key={`s2-${i}`} transform={`translate(${i * 60}, 0)`}>
            <rect x="0" y="0" width="40" height="40" rx="4" 
              className={`stroke-2 ${i < activeStep ? 'fill-indigo-100 stroke-indigo-400' : 'fill-slate-50 stroke-slate-200'}`} />
            <text x="20" y="25" textAnchor="middle" className="font-mono font-bold fill-slate-700">{char}</text>
          </g>
        ))}
      </g>
      {/* Connections (Matches) */}
      <g transform="translate(50, 0)">
        {activeStep > 0 && <path d="M 20 90 L 20 130" stroke="#10b981" strokeWidth="3" opacity={activeStep >= 1 ? 1 : 0} className="transition-opacity duration-300" />}
        {activeStep > 2 && <path d="M 140 90 L 80 130" stroke="#10b981" strokeWidth="3" opacity={activeStep >= 3 ? 1 : 0} className="transition-opacity duration-300" />}
        {activeStep > 3 && <path d="M 200 90 L 140 130" stroke="#10b981" strokeWidth="3" opacity={activeStep >= 4 ? 1 : 0} className="transition-opacity duration-300" />}
        {activeStep > 4 && <path d="M 260 90 L 260 130" stroke="#10b981" strokeWidth="3" opacity={activeStep >= 5 ? 1 : 0} className="transition-opacity duration-300" />}
      </g>
    </svg>
  );
};

const IntervalDiagram = ({ step }: { step: number }) => {
  const n = 5;
  // Step determines which interval length we are computing
  // length 1 (base cases), length 2, ... length n
  const activeLength = (step % n) + 1;

  return (
    <svg viewBox="0 0 400 250" className="w-full h-full text-slate-400">
      <g transform="translate(200, 220)">
        {Array.from({ length: n }).map((_, lenIdx) => {
          const length = lenIdx + 1;
          const numCells = n - length + 1;
          const yOffset = -length * 35;
          
          return Array.from({ length: numCells }).map((_, i) => {
            const xOffset = (i - numCells / 2 + 0.5) * 45;
            const isCurrentLength = length === activeLength;
            const isComputed = length < activeLength;
            
            return (
              <g key={`int-${length}-${i}`} transform={`translate(${xOffset}, ${yOffset})`}>
                <rect 
                  x="-20" y="-15" width="40" height="30" rx="4"
                  className={`transition-colors duration-300 stroke-2 ${
                    isCurrentLength ? 'fill-indigo-500 stroke-indigo-600' :
                    isComputed ? 'fill-emerald-100 stroke-emerald-500' : 'fill-slate-50 stroke-slate-200'
                  }`}
                />
                <text x="0" y="0" textAnchor="middle" alignmentBaseline="middle" 
                      className="text-[10px] font-mono font-bold"
                      fill={isCurrentLength ? 'white' : isComputed ? '#059669' : '#94a3b8'}>
                  {i},{i + length - 1}
                </text>
              </g>
            );
          });
        })}
        {/* Connection lines for active length */}
        {activeLength > 1 && Array.from({ length: n - activeLength + 1 }).map((_, i) => {
          const xOffset = (i - (n - activeLength + 1) / 2 + 0.5) * 45;
          const yOffset = -activeLength * 35;
          return (
            <g key={`lines-${i}`}>
              <path d={`M ${xOffset - 10} ${yOffset + 15} L ${xOffset - 22} ${yOffset + 35 - 15}`} stroke="#4f46e5" strokeWidth="1.5" strokeDasharray="2 2" className="animate-pulse" />
              <path d={`M ${xOffset + 10} ${yOffset + 15} L ${xOffset + 22} ${yOffset + 35 - 15}`} stroke="#4f46e5" strokeWidth="1.5" strokeDasharray="2 2" className="animate-pulse" />
            </g>
          );
        })}
      </g>
    </svg>
  );
};

const MiniDiagram = ({ type, isActive }: { type: PatternType, isActive: boolean }) => {
  const strokeColor = isActive ? '#4f46e5' : '#94a3b8';
  const fillColor = isActive ? '#e0e7ff' : '#f1f5f9';

  switch (type) {
    case 'line':
      return (
        <svg viewBox="0 0 100 40" className="w-16 h-8">
          <circle cx="20" cy="20" r="6" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <circle cx="50" cy="20" r="6" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <circle cx="80" cy="20" r="6" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <path d="M 28 20 L 42 20 M 58 20 L 72 20" stroke={strokeColor} strokeWidth="2" />
        </svg>
      );
    case 'grid':
      return (
        <svg viewBox="0 0 100 40" className="w-16 h-8">
          <rect x="25" y="5" width="12" height="12" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <rect x="42" y="5" width="12" height="12" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <rect x="25" y="22" width="12" height="12" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <rect x="42" y="22" width="12" height="12" rx="2" fill={strokeColor} stroke={strokeColor} strokeWidth="2" />
          <path d="M 48 18 L 48 20 M 38 28 L 40 28" stroke={strokeColor} strokeWidth="2" />
        </svg>
      );
    case 'subsequence':
      return (
        <svg viewBox="0 0 100 40" className="w-16 h-8">
          <rect x="20" y="5" width="15" height="10" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <rect x="45" y="5" width="15" height="10" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <rect x="30" y="25" width="15" height="10" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <rect x="55" y="25" width="15" height="10" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <path d="M 27 15 L 37 25 M 52 15 L 62 25" stroke={strokeColor} strokeWidth="1.5" />
        </svg>
      );
    case 'interval':
      return (
        <svg viewBox="0 0 100 40" className="w-16 h-8">
          <rect x="40" y="2" width="20" height="10" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <rect x="25" y="15" width="20" height="10" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <rect x="55" y="15" width="20" height="10" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <rect x="10" y="28" width="20" height="10" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <rect x="40" y="28" width="20" height="10" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <rect x="70" y="28" width="20" height="10" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
        </svg>
      );
  }
};


// --- MAIN APP COMPONENT ---

export default function App() {
  const [activeId, setActiveId] = useState<PatternType>('line');
  const [step, setStep] = useState(0);

  const activePattern = PATTERNS.find(p => p.id === activeId)!;

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setStep(s => s + 1);
    }, 1200);
    return () => clearInterval(timer);
  }, [activeId]);

  // Reset step on pattern change
  useEffect(() => {
    setStep(0);
  }, [activeId]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-12 flex flex-col items-center">
      
      {/* Header */}
      <header className="max-w-6xl w-full mb-10 text-center md:text-left">
        <div className="inline-block px-3 py-1 mb-4 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold tracking-wider uppercase">
          Module 5
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
          DP Pattern Library
        </h1>
        <p className="mt-3 text-lg text-slate-600 max-w-2xl">
          Recognizing the shape of the subproblem is 80% of the battle. 
          Explore the fundamental topological patterns of Dynamic Programming.
        </p>
      </header>

      {/* Main Content Split Layout */}
      <main className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar: Pattern List */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {PATTERNS.map((pattern) => {
            const isActive = pattern.id === activeId;
            return (
              <button
                key={pattern.id}
                onClick={() => setActiveId(pattern.id)}
                className={`group text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 ${
                  isActive 
                    ? 'bg-white border-indigo-500 shadow-md ring-4 ring-indigo-50' 
                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                }`}
              >
                <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-indigo-50' : 'bg-slate-100 group-hover:bg-white'}`}>
                  <MiniDiagram type={pattern.id} isActive={isActive} />
                </div>
                <div>
                  <h3 className={`font-bold text-lg ${isActive ? 'text-indigo-700' : 'text-slate-800'}`}>
                    {pattern.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2 leading-snug">
                    {pattern.shortDesc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Detail Area */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          
          {/* Top Half: Animated Diagram */}
          <div className="bg-slate-900 relative h-64 md:h-80 flex items-center justify-center p-6 border-b border-slate-200 overflow-hidden">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-10" 
                 style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-mono text-slate-300">Live Trace</span>
            </div>

            <div className="relative w-full max-w-md h-full">
              {activeId === 'line' && <LineDiagram step={step} />}
              {activeId === 'grid' && <GridDiagram step={step} />}
              {activeId === 'subsequence' && <SubsequenceDiagram step={step} />}
              {activeId === 'interval' && <IntervalDiagram step={step} />}
            </div>
          </div>

          {/* Bottom Half: Details & Code */}
          <div className="p-8 flex flex-col gap-6 flex-grow">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                {activePattern.name}
                <span className="text-indigo-500 text-sm font-normal bg-indigo-50 px-2 py-1 rounded-md ml-2">
                  Topology
                </span>
              </h2>
              <p className="mt-3 text-slate-600 leading-relaxed">
                {activePattern.longDesc}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              {/* Formal Definition */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">State & Transition</h4>
                <div className="font-mono text-sm flex flex-col gap-3">
                  <div>
                    <span className="text-slate-400 block text-xs mb-1">// State Definition</span>
                    <span className="text-indigo-700 bg-indigo-50 px-2 py-1 rounded">{activePattern.stateDef}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs mb-1">// Recurrence Relation</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded whitespace-pre-wrap">{activePattern.transition}</span>
                  </div>
                </div>
              </div>

              {/* Classic Problems */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <h4 className="text-