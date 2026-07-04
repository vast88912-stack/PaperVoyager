import React, { useState, useEffect } from 'react';

// --- Types & Hooks --- //

type AnimationState = {
  step: number;
  isPlaying: boolean;
  togglePlay: () => void;
  reset: () => void;
};

function useAnimation(maxSteps: number, intervalMs: number = 1200): AnimationState {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % maxSteps);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, maxSteps, intervalMs]);

  return {
    step,
    isPlaying,
    togglePlay: () => setIsPlaying(!isPlaying),
    reset: () => setStep(0),
  };
}

// --- Visualizer Components --- //

const SvgDefs = () => (
  <svg className="hidden">
    <defs>
      <marker id="arrow-blue" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" fill="#3B82F6" />
      </marker>
      <marker id="arrow-emerald" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" fill="#10B981" />
      </marker>
      <marker id="arrow-indigo" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" fill="#6366F1" />
      </marker>
      <marker id="arrow-purple" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" fill="#8B5CF6" />
      </marker>
    </defs>
  </svg>
);

const LinePatternVisualizer = ({ anim }: { anim: AnimationState }) => {
  const { step } = anim;
  
  // States: 
  // 0: Initial array, solving for i
  // 1: Highlight i-2
  // 2: Highlight i-1
  // 3: Compute i
  const isIMinus2 = step >= 1;
  const isIMinus1 = step >= 2;
  const isIComputed = step >= 3;

  return (
    <div className="relative w-full h-40 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center">
      <svg viewBox="0 0 400 150" className="w-full max-w-[300px] h-full">
        {/* Nodes */}
        {[0, 1, 2, 3, 4].map((i) => {
          let bg = "#ffffff";
          let stroke = "#cbd5e1"; // slate-300
          if (i === 2 && isIMinus2) { bg = "#eff6ff"; stroke = "#3b82f6"; } // blue-50, blue-500
          if (i === 3 && isIMinus1) { bg = "#eff6ff"; stroke = "#3b82f6"; }
          if (i === 4) { bg = isIComputed ? "#ecfdf5" : "#f8fafc"; stroke = isIComputed ? "#10b981" : "#94a3b8"; }
          
          return (
            <g key={i} transform={`translate(${40 + i * 60}, 60)`}>
              <rect x="0" y="0" width="40" height="40" rx="6" fill={bg} stroke={stroke} strokeWidth="2" className="transition-all duration-300" />
              <text x="20" y="25" textAnchor="middle" fontSize="14" fill={stroke === "#cbd5e1" ? "#94a3b8" : "#1e293b"} fontFamily="monospace" fontWeight="bold">
                {i === 2 ? 'i-2' : i === 3 ? 'i-1' : i === 4 ? 'i' : ''}
              </text>
            </g>
          );
        })}
        
        {/* Edges */}
        <g className="transition-opacity duration-300" opacity={isIComputed ? 1 : 0}>
          {/* Arc from i-2 to i */}
          <path d="M 180 55 C 210 20, 250 20, 290 55" fill="none" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrow-blue)" />
          {/* Arc from i-1 to i */}
          <path d="M 240 55 C 255 35, 270 35, 290 55" fill="none" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrow-blue)" />
        </g>
      </svg>
      <div className="absolute bottom-2 right-2 text-xs font-medium text-slate-500 bg-white/80 px-2 py-1 rounded">
        {step === 0 && "Target: dp[i]"}
        {step === 1 && "Access dp[i-2]"}
        {step === 2 && "Access dp[i-1]"}
        {step === 3 && "Combine for dp[i]"}
      </div>
    </div>
  );
};

const GridPatternVisualizer = ({ anim }: { anim: AnimationState }) => {
  const { step } = anim;
  
  // States:
  // 0: Initial grid
  // 1: Highlight top (i-1, j)
  // 2: Highlight left (i, j-1)
  // 3: Compute (i, j)
  const isTop = step >= 1;
  const isLeft = step >= 2;
  const isComputed = step >= 3;

  return (
    <div className="relative w-full h-40 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center">
      <svg viewBox="0 0 400 150" className="w-full max-w-[200px] h-full">
        <g transform="translate(60, 15)">
          {[0, 1, 2].map(row => 
            [0, 1, 2].map(col => {
              const isTarget = row === 2 && col === 2;
              const isTopCell = row === 1 && col === 2;
              const isLeftCell = row === 2 && col === 1;
              
              let bg = "#ffffff";
              let stroke = "#cbd5e1";
              
              if (isTopCell && isTop) { bg = "#f0fdf4"; stroke = "#10b981"; }
              if (isLeftCell && isLeft) { bg = "#f0fdf4"; stroke = "#10b981"; }
              if (isTarget) { bg = isComputed ? "#eef2ff" : "#f8fafc"; stroke = isComputed ? "#6366f1" : "#94a3b8"; }

              return (
                <g key={`${row}-${col}`} transform={`translate(${col * 45}, ${row * 45})`}>
                  <rect x="0" y="0" width="38" height="38" rx="6" fill={bg} stroke={stroke} strokeWidth="2" className="transition-all duration-300" />
                </g>
              );
            })
          )}
          
          {/* Arrows */}
          <g className="transition-opacity duration-300" opacity={isComputed ? 1 : 0}>
            <path d="M 110 84 L 110 95" fill="none" stroke="#10B981" strokeWidth="2" markerEnd="url(#arrow-emerald)" />
            <path d="M 84 110 L 95 110" fill="none" stroke="#10B981" strokeWidth="2" markerEnd="url(#arrow-emerald)" />
          </g>
        </g>
      </svg>
      <div className="absolute bottom-2 right-2 text-xs font-medium text-slate-500 bg-white/80 px-2 py-1 rounded">
        {step === 0 && "Target: dp[i][j]"}
        {step === 1 && "Fetch dp[i-1][j]"}
        {step === 2 && "Fetch dp[i][j-1]"}
        {step === 3 && "dp[i][j] Solved"}
      </div>
    </div>
  );
};

const SubsequenceVisualizer = ({ anim }: { anim: AnimationState }) => {
  const { step } = anim;
  
  // States:
  // 0: Target i
  // 1: Scan j=0
  // 2: Scan j=1
  // 3: Scan j=2, found max
  // 4: Update i
  
  return (
    <div className="relative w-full h-40 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center">
      <svg viewBox="0 0 400 150" className="w-full max-w-[300px] h-full">
        {/* Bars representing values */}
        {[10, 30, 20, 40, 0].map((val, i) => {
          const isTarget = i === 4;
          const isScanning = (step === 1 && i === 0) || (step === 2 && i === 1) || (step >= 3 && i === 3);
          
          let fill = "#cbd5e1";
          if (isTarget) fill = step === 4 ? "#8b5cf6" : "#e2e8f0";
          if (isScanning) fill = step >= 3 && i === 3 ? "#8b5cf6" : "#cbd5e1"; // Max found at index 3
          
          return (
            <g key={i} transform={`translate(${50 + i * 50}, ${120 - val})`}>
              {val > 0 && <rect x="0" y="0" width="30" height={val} rx="4" fill={fill} className="transition-all duration-300" />}
              {isTarget && <rect x="0" y="-40" width="30" height={step === 4 ? 40 : 10} rx="4" fill={fill} className="transition-all duration-300" />}
              <text x="15" y={val > 0 ? val + 20 : 20} textAnchor="middle" fontSize="12" fill="#64748b" fontFamily="monospace">
                {isTarget ? 'i' : `j${i}`}
              </text>
            </g>
          );
        })}
        
        {/* Scan Arrows */}
        <g className="transition-opacity duration-300" opacity={step > 0 && step < 4 ? 1 : 0}>
          {step === 1 && <path d="M 65 100 C 130 50, 200 50, 260 80" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrow-purple)" />}
          {step === 2 && <path d="M 115 80 C 160 50, 210 50, 260 80" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrow-purple)" />}
          {step === 3 && <path d="M 215 70 C 230 50, 245 50, 260 80" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrow-purple)" />}
        </g>
      </svg>
      <div className="absolute bottom-2 right-2 text-xs font-medium text-slate-500 bg-white/80 px-2 py-1 rounded">
        {step === 0 && "Target: dp[i]"}
        {step === 1 && "Scan previous j..."}
        {step === 2 && "Scan previous j..."}
        {step === 3 && "Max found at j"}
        {step === 4 && "dp[i] = dp[j] + 1"}
      </div>
    </div>
  );
};

const IntervalVisualizer = ({ anim }: { anim: AnimationState }) => {
  const { step } = anim;
  
  // States:
  // 0: Target interval [i, j]
  // 1: Split at k: [i, k]
  // 2: Split at k: [k+1, j]
  // 3: Merge result
  const showLeft = step >= 1;
  const showRight = step >= 2;
  const showMerge = step >= 3;

  return (
    <div className="relative w-full h-40 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center">
      <svg viewBox="0 0 400 150" className="w-full max-w-[300px] h-full">
        {/* Base Array */}
        <g transform="translate(50, 90)">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={i * 45} y="0" width="40" height="20" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
          ))}
          <text x="20" y="40" textAnchor="middle" fontSize="12" fill="#64748b" fontFamily="monospace">i</text>
          <text x="110" y="40" textAnchor="middle" fontSize="12" fill="#64748b" fontFamily="monospace">k</text>
          <text x="245" y="40" textAnchor="middle" fontSize="12" fill="#64748b" fontFamily="monospace">j</text>
        </g>
        
        {/* Brackets / Intervals */}
        {/* Left [i, k] */}
        <g className="transition-opacity duration-300" opacity={showLeft ? 1 : 0}>
          <path d="M 50 85 L 50 75 L 135 75 L 135 85" fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="92" y="65" textAnchor="middle" fontSize="12" fill="#D97706" fontWeight="bold">dp[i][k]</text>
        </g>
        
        {/* Right [k+1, j] */}
        <g className="transition-opacity duration-300" opacity={showRight ? 1 : 0}>
          <path d="M 140 85 L 140 75 L 270 75 L 270 85" fill="none" stroke="#06B6D4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="205" y="65" textAnchor="middle" fontSize="12" fill="#0891B2" fontWeight="bold">dp[k+1][j]</text>
        </g>

        {/* Master [i, j] */}
        <g className="transition-opacity duration-300" opacity={step === 0 || showMerge ? 1 : 0}>
          <path d="M 50 40 L 50 30 L 270 30 L 270 40" fill="none" stroke="#334155" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="160" y="20" textAnchor="middle" fontSize="14" fill="#334155" fontWeight="bold">dp[i][j]</text>
        </g>
        
        {/* Merge Arrows */}
        <g className="transition-opacity duration-300" opacity={showMerge ? 1 : 0}>
          <path d="M 92 50 L 160 35" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3" />
          <path d="M 205 50 L 160 35" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3" />
        </g>
      </svg>
      <div className="absolute bottom-2 right-2 text-xs font-medium text-slate-500 bg-white/80 px-2 py-1 rounded">
        {step === 0 && "Target: [i, j]"}
        {step === 1 && "Sub-interval [i, k]"}
        {step === 2 && "Sub-interval [k+1, j]"}
        {step === 3 && "Combine + Cost"}
      </div>
    </div>
  );
};

// --- Library Data & Card Component --- //

type PatternDef = {
  id: string;
  title: string;
  desc: string;
  examples: string[];
  recurrence: string;
  Visualizer: React.FC<{ anim: AnimationState }>;
  steps: number;
};

const PATTERNS: PatternDef[] = [
  {
    id: "line",
    title: "1D Line",
    desc: "State depends on a constant number of immediately preceding items. Think of iterating through an array.",
    examples: ["Fibonacci", "Climbing Stairs", "House Robber"],
    recurrence: "dp[i] = dp[i-1] + dp[i-2]",
    Visualizer: LinePatternVisualizer,
    steps: 4,
  },
  {
    id: "grid",
    title: "2D Grid",
    desc: "State transitions happen across two dimensions. Typically paths moving right or down in a matrix.",
    examples: ["Unique Paths", "Minimum Path Sum", "Edit Distance"],
    recurrence: "dp[i][j] = dp[i-1][j] + dp[i][j-1]",
    Visualizer: GridPatternVisualizer,
    steps: 4,
  },
  {
    id: "subsequence",
    title: "Subsequence",
    desc: "Current state looks back at potentially ALL previous states to find optimal compatible sub-structures.",
    examples: ["Longest Increasing Subsequence", "Longest Common Subsequence"],
    recurrence: "dp[i] = max_{j<i}(dp[j] + 1)",
    Visualizer: SubsequenceVisualizer,
    steps: 5,
  },
  {
    id: "interval",
    title: "Interval",
    desc: "State represents an interval [i, j]. Build up solutions from smaller intervals, often splitting at a point k.",
    examples: ["Matrix Chain Multiplication", "Palindrome Partitioning"],
    recurrence: "dp[i][j] = min_{k}(dp[i][k] + dp[k+1][j])",
    Visualizer: IntervalVisualizer,
    steps: 4,
  }
];

const PatternCard = ({ pattern }: { pattern: PatternDef }) => {
  const anim = useAnimation(pattern.steps, 1400);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col overflow-hidden">
      {/* Visualizer Area */}
      <div className="p-4 bg-slate-50/50 border-b border-slate-100 relative group">
        <pattern.Visualizer anim={anim} />
        <button 
          onClick={anim.togglePlay}
          className="absolute top-6 right-6 p-2 bg-white rounded-full shadow border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          title={anim.isPlaying ? "Pause animation" : "Play animation"}
        >
          {anim.isPlaying ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18