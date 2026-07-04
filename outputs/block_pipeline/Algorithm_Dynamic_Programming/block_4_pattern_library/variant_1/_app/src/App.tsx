import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Grid, Layers, Box, GitMerge, ChevronRight, Play, RotateCcw, Info } from 'lucide-react';

// --- Types & Interfaces ---

type PatternId = 'linear' | 'grid' | 'subsequence' | 'interval';

interface PatternData {
  id: PatternId;
  title: string;
  icon: React.ElementType;
  description: string;
  examples: string[];
  complexity: string;
  recurrence: string;
}

// --- Data ---

const PATTERNS: PatternData[] = [
  {
    id: 'linear',
    title: 'Linear DP',
    icon: ArrowRight,
    description: 'Problems solved by iterating linearly (1D array). State usually depends on previous k elements.',
    examples: ['Fibonacci', 'Climbing Stairs', 'House Robber'],
    complexity: 'O(N)',
    recurrence: 'dp[i] = f(dp[i-1], dp[i-2])'
  },
  {
    id: 'grid',
    title: 'Grid / Matrix',
    icon: Grid,
    description: 'Movement on a 2D map. State depends on adjacent cells (usually top and left).',
    examples: ['Unique Paths', 'Min Path Sum', 'Dungeon Game'],
    complexity: 'O(M × N)',
    recurrence: 'dp[r][c] = f(dp[r-1][c], dp[r][c-1])'
  },
  {
    id: 'subsequence',
    title: 'Dual Sequence',
    icon: Layers,
    description: 'Comparing two strings or arrays. Table represents prefixes of both inputs.',
    examples: ['LCS', 'Edit Distance', 'Wildcard Match'],
    complexity: 'O(N × M)',
    recurrence: 'if s1[i]==s2[j] ... else ...'
  },
  {
    id: 'interval',
    title: 'Interval DP',
    icon: GitMerge,
    description: 'Solving for ranges [i, j]. Builds solution from smaller sub-ranges to larger ones.',
    examples: ['Matrix Chain Mult', 'Burst Balloons', 'Palindrome Substr'],
    complexity: 'O(N³)',
    recurrence: 'dp[i][j] = max(dp[i][k] + dp[k+1][j])'
  }
];

// --- Visual Components ---

// 1. Linear Diagram
const LinearVisual = ({ isActive }: { isActive: boolean }) => {
  const [step, setStep] = useState(0);
  const totalSteps = 5;

  useEffect(() => {
    if (!isActive) {
      setStep(0);
      return;
    }
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % (totalSteps + 2)); // +2 for pause at end
    }, 600);
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="w-full h-32 flex items-center justify-center space-x-2">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const filled = i < step;
        const current = i === step;
        return (
          <div key={i} className="relative">
            <div
              className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                filled
                  ? 'bg-blue-500 border-blue-600 text-white shadow-md'
                  : current
                  ? 'bg-blue-100 border-blue-400 text-blue-800 scale-110'
                  : 'bg-white border-slate-200 text-slate-300'
              }`}
            >
              {filled || current ? i : ''}
            </div>
            {/* Dependency Arrow */}
            {current && i > 0 && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-slate-400 whitespace-nowrap animate-bounce">
                Dep: {i-1}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// 2. Grid Diagram
const GridVisual = ({ isActive }: { isActive: boolean }) => {
  const rows = 3;
  const cols = 4;
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!isActive) {
      setActiveCell(null);
      return;
    }
    let r = 0, c = 0;
    const interval = setInterval(() => {
      setActiveCell([r, c]);
      c++;
      if (c >= cols) {
        c = 0;
        r++;
      }
      if (r >= rows) {
        r = 0; // Loop back
      }
    }, 400);
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="w-full h-32 flex items-center justify-center">
      <div className="grid grid-cols-4 gap-1">
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const isCurrent = activeCell && activeCell[0] === r && activeCell[1] === c;
            const isDone = activeCell && (r < activeCell[0] || (r === activeCell[0] && c < activeCell[1]));
            
            // Determine dependency highlighting
            const isTopDep = isCurrent && r > 0;
            const isLeftDep = isCurrent && c > 0;

            return (
              <div
                key={`${r}-${c}`}
                className={`w-8 h-8 rounded border flex items-center justify-center text-xs transition-colors duration-200 relative ${
                  isCurrent
                    ? 'bg-indigo-500 border-indigo-600 text-white scale-105 z-10'
                    : isDone
                    ? 'bg-indigo-100 border-indigo-200 text-indigo-800'
                    : 'bg-slate-50 border-slate-200 text-slate-300'
                }`}
              >
                {/* Dependency Indicators */}
                {isCurrent && (
                   <>
                     {isTopDep && <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-3 bg-indigo-300 opacity-50" />}
                     {isLeftDep && <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-1 bg-indigo-300 opacity-50" />}
                   </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// 3. Subsequence Diagram (LCS style)
const SubsequenceVisual = ({ isActive }: { isActive: boolean }) => {
  const s1 = "ABC";
  const s2 = "AC";
  // Matrix dimensions: (s2.length+1) x (s1.length+1)
  // We will simulate filling the DP table
  const [cell, setCell] = useState<number>(-1);
  const totalCells = (s1.length + 1) * (s2.length + 1);

  useEffect(() => {
    if (!isActive) {
      setCell(-1);
      return;
    }
    const interval = setInterval(() => {
      setCell(prev => (prev + 1) % (totalCells + 4)); // +4 for pause
    }, 300);
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="w-full h-32 flex items-center justify-center">
      <div className="grid grid-cols-4 gap-1"> {/* 3 chars + 1 empty = 4 cols */}
        {/* Header Row */}
        <div className="w-6 h-6"></div>
        <div className="w-6 h-6 flex items-center justify-center text-xs font-mono text-slate-400">ε</div>
        {s1.split('').map((char, i) => (
          <div key={i} className="w-6 h-6 flex items-center justify-center text-xs font-mono font-bold text-slate-600">{char}</div>
        ))}

        {/* Rows */}
        {['ε', ...s2.split('')].map((rowChar, r) => (
          <React.Fragment key={r}>
            <div className="w-6 h-6 flex items-center justify-center text-xs font-mono font-bold text-slate-600">{rowChar}</div>
            {['ε', ...s1.split('')].map((colChar, c) => {
              const linearIndex = r * 4 + c;
              const isCurrent = cell === linearIndex;
              const isFilled = cell > linearIndex;
              const match = rowChar === colChar && rowChar !== 'ε';

              return (
                <div
                  key={c}
                  className={`w-6 h-6 border rounded flex items-center justify-center text-[10px] transition-all ${
                    isCurrent
                      ? 'bg-emerald-500 border-emerald-600 text-white scale-110 shadow-lg'
                      : isFilled
                      ? match ? 'bg-emerald-200 border-emerald-300' : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                      : 'bg-white border-slate-100'
                  }`}
                >
                  {isFilled || isCurrent ? (match ? '↖' : '↑←') : ''}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// 4. Interval Diagram (Pyramid fill)
const IntervalVisual = ({ isActive }: { isActive: boolean }) => {
  // Simulating filling upper triangle of a matrix
  // Cells (i, j) where i <= j.
  // Fill order: by length (len = 1 to N), then i.
  const N = 4;
  const [active, setActive] = useState<{i: number, j: number} | null>(null);

  useEffect(() => {
    if (!isActive) {
      setActive(null);
      return;
    }

    const sequence: {i: number, j: number}[] = [];
    for (let len = 1; len <= N; len++) {
      for (let i = 0; i <= N - len; i++) {
        const j = i + len - 1;
        sequence.push({ i, j });
      }
    }

    let idx = 0;
    const interval = setInterval(() => {
      setActive(sequence[idx]);
      idx++;
      if (idx >= sequence.length) idx = 0; // Loop
    }, 500);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="w-full h-32 flex items-center justify-center">
       <div className="relative w-40 h-32">
         {/* Render cells as a pyramid/triangle structure visually */}
         {Array.from({ length: N }).map((_, row) => {
            // In a matrix, row is i, col is j.
            // We only care about j >= i.
            return Array.from({ length: N - row }).map((_, k) => {
              const i = row;
              const j = row + k;
              const isCurrent = active && active.i === i && active.j === j;
              const isDone = active && ( (j - i) < (active.j - active.i) || ( (j-i) === (active.j - active.i) && i < active.i ) );
              
              // Positioning for pyramid:
              // x = (i + j) * spacing / 2
              // y = (j - i) * spacing
              // This rotates the matrix 45 degrees.
              
              const left = (i * 30) + (k * 15); // Simple staggering
              const top = k * 25; 

              // Let's use a standard matrix grid but hide lower half to represent interval DP table usually
              return (
                 <div
                  key={`${i}-${j}`}
                  style={{
                    position: 'absolute',
                    left: `${(j) * 24}px`,
                    top: `${(i) * 24}px`,
                  }}
                  className={`w-5 h-5 border text-[9px] flex items-center justify-center rounded transition-colors ${
                    isCurrent
                      ? 'bg-orange-500 border-orange-600 text-white z-10 scale-125'
                      : isDone
                      ? 'bg-orange-100 border-orange-200 text-orange-800'
                      : 'bg-slate-50 border-slate-200 text-slate-300'
                  }`}
                 >
                   {i},{j}
                 </div>
              );
            });
         })}
         {/* Dependency Lines for current */}
         {active && active.j > active.i && (
            <div className="absolute top-0 right-0 text-[10px] text-slate-400 p-1 bg-white/80 border rounded shadow-sm">
              Split: [{active.i}...k...{active.j}]
            </div>
         )}
       </div>
    </div>
  );
};


// --- Card Component ---

const PatternCard = ({ data }: { data: PatternData }) => {
  const [isHovered, setIsHovered] = useState(false);

  const renderVisual = () => {
    switch (data.id) {
      case 'linear': return <LinearVisual isActive={isHovered} />;
      case 'grid': return <GridVisual isActive={isHovered} />;
      case 'subsequence': return <SubsequenceVisual isActive={isHovered} />;
      case 'interval': return <IntervalVisual isActive={isHovered} />;
      default: return null;
    }
  };

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 overflow-hidden group flex flex-col h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${isHovered ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'} transition-colors`}>
            <data.icon size={20} />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">{data.title}</h3>
        </div>
        <span className="text-xs font-mono bg-slate-200 text-slate-600 px-2 py-1 rounded">
          {data.complexity}
        </span>
      </div>

      {/* Visual Area */}
      <div className="bg-slate-50 border-b border-slate-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />
        {renderVisual()}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col space-y-4">
        <p className="text-sm text-slate-600 leading-relaxed">
          {data.description}
        </p>

        {/* Recurrence Snippet */}
        <div className="bg-slate-900 rounded-md p-3 shadow-inner group-hover:ring-2 ring-blue-100 transition-all">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider ml-auto font-bold">Recurrence</span>
          </div>
          <code className="text-xs font-mono text-blue-300 block overflow-x-auto whitespace-nowrap">
            {data.recurrence}
          </code>
        </div>

        {/* Examples Tags */}
        <div className="mt-auto pt-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 block">Common Problems</span>
          <div className="flex flex-wrap gap-2">
            {data.examples.map((ex, i) => (
              <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 hover:bg-white hover:border-blue-300 hover:text-blue-600 transition-colors cursor-default">
                {ex}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 pb-20">
      {/* Navigation / Header Mock */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
              DP
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">AlgoLab</span>
          </div>
          <div className="text-sm font-medium text-slate-500">
            Module 5: Pattern Library
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Intro Section */}
        <div className="mb-12 max-w-2xl">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-4">
            Recognizing the Shape
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Dynamic Programming problems often fall into a few distinct structural patterns. 
            Identifying the "shape" of the subproblems is the first step to writing the recurrence relation.
            Hover over the cards below to visualize how the state tables fill up.
          </p>
        </div>

        {/* Grid of Patterns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {PATTERNS.map((pattern) => (
            <PatternCard key={pattern.id} data={pattern} />
          ))}
        </div>

        {/* Footer / Context */}
        <div className="mt-16 border-t border-slate-200 pt-8 flex flex-col md:flex-row items-start md:items-center justify-between text-slate-500 text-sm">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Info size={16} />
            <span>
              Tip: Most interview problems are variations of <strong>Linear</strong> or <strong>Grid</strong> patterns.
            </span>
          </div>
          <div className="flex space-x-6">
            <button className="hover:text-blue-600 transition-colors">Back to Knapsack</button>
            <button className="flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors">
              Start Practice Quiz <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// Runtime deps: lucide-react@0.263.1