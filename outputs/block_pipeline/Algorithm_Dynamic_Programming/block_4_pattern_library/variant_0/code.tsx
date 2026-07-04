import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, BookOpen, Code, Layout, ArrowRight, Layers, Maximize, GitMerge } from 'lucide-react';

// --- Types ---
type StepState = 0 | 1 | 2 | 3;

interface PatternData {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  examples: string[];
  formula: string;
  color: string;
  Visual: React.FC<{ step: StepState }>;
}

// --- Shared SVG Definitions ---
const SvgDefs = () => (
  <svg width="0" height="0" className="absolute">
    <defs>
      <marker id="arrow-indigo" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" className="fill-indigo-500" />
      </marker>
      <marker id="arrow-emerald" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" className="fill-emerald-500" />
      </marker>
    </defs>
  </svg>
);

// --- Visual Components ---

const LineVisual: React.FC<{ step: StepState }> = ({ step }) => (
  <svg viewBox="0 0 200 80" className="w-full h-full font-mono text-xs">
    {/* Base Array */}
    {[0, 1, 2, 3, 4].map((i) => (
      <g key={i} transform={`translate(${20 + i * 32}, 40)`}>
        <rect
          x="0" y="0" width="24" height="24" rx="4"
          className={`transition-all duration-300 ${
            i === 1 && step >= 2 ? 'fill-indigo-100 stroke-indigo-400 stroke-2' :
            i === 2 && step >= 1 ? 'fill-indigo-100 stroke-indigo-400 stroke-2' :
            i === 3 && step >= 3 ? 'fill-emerald-100 stroke-emerald-500 stroke-2' :
            'fill-slate-50 stroke-slate-200 stroke-2'
          }`}
        />
        <text x="12" y="16" textAnchor="middle" className="fill-slate-400">
          {i === 1 ? 'i-2' : i === 2 ? 'i-1' : i === 3 ? 'i' : ''}
        </text>
      </g>
    ))}
    
    {/* Arrows */}
    <g className={`transition-opacity duration-500 ${step >= 3 ? 'opacity-100' : 'opacity-0'}`}>
      <path d="M 64 40 Q 90 20 124 38" fill="none" className="stroke-indigo-500 stroke-2" markerEnd="url(#arrow-indigo)" />
      <path d="M 96 40 Q 110 30 124 38" fill="none" className="stroke-indigo-500 stroke-2" markerEnd="url(#arrow-indigo)" />
    </g>
  </svg>
);

const GridVisual: React.FC<{ step: StepState }> = ({ step }) => (
  <svg viewBox="0 0 200 100" className="w-full h-full font-mono text-xs">
    <g transform="translate(60, 10)">
      {/* 3x3 Grid */}
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => {
          const isTop = row === 0 && col === 1;
          const isLeft = row === 1 && col === 0;
          const isTarget = row === 1 && col === 1;
          
          let stateClass = 'fill-slate-50 stroke-slate-200 stroke-2';
          if (isTop && step >= 1) stateClass = 'fill-indigo-100 stroke-indigo-400 stroke-2';
          if (isLeft && step >= 2) stateClass = 'fill-indigo-100 stroke-indigo-400 stroke-2';
          if (isTarget && step >= 3) stateClass = 'fill-emerald-100 stroke-emerald-500 stroke-2';

          return (
            <rect
              key={`${row}-${col}`}
              x={col * 28} y={row * 28} width="24" height="24" rx="4"
              className={`transition-all duration-300 ${stateClass}`}
            />
          );
        })
      )}
      
      {/* Arrows */}
      <g className={`transition-opacity duration-500 ${step >= 3 ? 'opacity-100' : 'opacity-0'}`}>
        <path d="M 40 24 L 40 34" fill="none" className="stroke-indigo-500 stroke-2" markerEnd="url(#arrow-indigo)" />
        <path d="M 24 40 L 34 40" fill="none" className="stroke-indigo-500 stroke-2" markerEnd="url(#arrow-indigo)" />
      </g>
    </g>
  </svg>
);

const SubsequenceVisual: React.FC<{ step: StepState }> = ({ step }) => {
  const s1 = ['A', 'B', 'C', 'D'];
  const s2 = ['A', 'X', 'B', 'C'];
  
  return (
    <svg viewBox="0 0 200 80" className="w-full h-full font-mono text-sm font-bold">
      {/* String 1 */}
      {s1.map((char, i) => (
        <text
          key={`s1-${i}`} x={40 + i * 40} y="30" textAnchor="middle"
          className={`transition-colors duration-300 ${
            (i === 1 && step >= 1) || (i === 2 && step >= 2) ? 'fill-indigo-600' : 'fill-slate-400'
          }`}
        >
          {char}
        </text>
      ))}
      
      {/* String 2 */}
      {s2.map((char, i) => (
        <text
          key={`s2-${i}`} x={40 + i * 40} y="70" textAnchor="middle"
          className={`transition-colors duration-300 ${
            (i === 2 && step >= 1) || (i === 3 && step >= 2) ? 'fill-indigo-600' : 'fill-slate-400'
          }`}
        >
          {char}
        </text>
      ))}

      {/* Connections */}
      <g className="stroke-indigo-400 stroke-2 stroke-dashed" fill="none">
        <path d="M 40 35 L 40 55" className={`transition-opacity duration-300 ${step >= 3 ? 'opacity-30' : 'opacity-0'}`} />
        <path d="M 80 35 L 120 55" className={`transition-opacity duration-300 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`} />
        <path d="M 120 35 L 160 55" className={`transition-opacity duration-300 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`} />
      </g>
    </svg>
  );
};

const IntervalVisual: React.FC<{ step: StepState }> = ({ step }) => (
  <svg viewBox="0 0 200 80" className="w-full h-full font-mono text-xs">
    {/* Base Array */}
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <rect
        key={i} x={20 + i * 26} y="45" width="22" height="22" rx="4"
        className={`transition-all duration-300 ${
          i >= 1 && i <= 2 && step >= 1 ? 'fill-indigo-100 stroke-indigo-400 stroke-2' :
          i >= 3 && i <= 4 && step >= 2 ? 'fill-purple-100 stroke-purple-400 stroke-2' :
          'fill-slate-50 stroke-slate-200 stroke-2'
        }`}
      />
    ))}

    {/* Brackets */}
    <g fill="none" className="stroke-2 transition-all duration-500">
      {/* Left Interval */}
      <path d="M 46 40 L 46 32 L 98 32 L 98 40" 
            className={`stroke-indigo-400 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`} />
      
      {/* Right Interval */}
      <path d="M 98 40 L 98 24 L 150 24 L 150 40" 
            className={`stroke-purple-400 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`} />
      
      {/* Combined Interval */}
      <path d="M 46 20 L 46 12 L 150 12 L 150 20" 
            className={`stroke-emerald-500 ${step >= 3 ? 'opacity-100' : 'opacity-0'}`} />
    </g>
    
    <text x="98" y="8" textAnchor="middle" 
          className={`fill-emerald-600 text-[10px] font-bold transition-opacity duration-300 ${step >= 3 ? 'opacity-100' : 'opacity-0'}`}>
      dp[i][j]
    </text>
  </svg>
);

// --- Data ---
const patterns: PatternData[] = [
  {
    id: 'line',
    title: '1D / Line',
    icon: <ArrowRight className="w-5 h-5" />,
    description: 'State depends on a constant number of previous states in a linear sequence.',
    examples: ['Fibonacci', 'Climbing Stairs', 'House Robber'],
    formula: 'dp[i] = dp[i-1] + dp[i-2]',
    color: 'indigo',
    Visual: LineVisual,
  },
  {
    id: 'grid',
    title: '2D / Grid',
    icon: <Layout className="w-5 h-5" />,
    description: 'State depends on spatial neighbors (usually top and left) in a matrix.',
    examples: ['Unique Paths', 'Min Path Sum', 'Maximal Square'],
    formula: 'dp[i][j] = dp[i-1][j] + dp[i][j-1]',
    color: 'blue',
    Visual: GridVisual,
  },
  {
    id: 'subsequence',
    title: 'Subsequence',
    icon: <GitMerge className="w-5 h-5" />,
    description: 'State tracks matching elements across two sequences or within one sequence.',
    examples: ['Longest Common Subsequence', 'Edit Distance'],
    formula: 'if (s[i]==t[j]) dp[i][j] = dp[i-1][j-1] + 1',
    color: 'violet',
    Visual: SubsequenceVisual,
  },
  {
    id: 'interval',
    title: 'Interval',
    icon: <Layers className="w-5 h-5" />,
    description: 'State depends on smaller sub-intervals [i, k] and [k+1, j] within a range.',
    examples: ['Matrix Chain Multiplication', 'Burst Balloons'],
    formula: 'dp[i][j] = min(dp[i][k] + dp[k+1][j] + cost)',
    color: 'emerald',
    Visual: IntervalVisual,
  }
];

// --- Components ---

const PatternCard: React.FC<{ pattern: PatternData }> = ({ pattern }) => {
  const [step, setStep] = useState<StepState>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setStep((s) => (s >= 3 ? 0 : (s + 1) as StepState));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleManualStep = () => {
    setIsPlaying(false);
    setStep((s) => (s >= 3 ? 0 : (s + 1) as StepState));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setStep(0);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Header */}
      <div className="