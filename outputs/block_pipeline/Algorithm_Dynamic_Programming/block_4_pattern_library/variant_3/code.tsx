import React, { useState, useEffect, useRef } from 'react';

// --- Icons (Raw SVG to avoid dependencies) ---
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
);
const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
);
const StepForwardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
);
const ResetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
);
const BookOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
);

// --- Helper Components ---

const Arrow = ({ startX, startY, endX, endY, curve = 0, color = "#6366f1", label = "" }: { startX: number, startY: number, endX: number, endY: number, curve?: number, color?: string, label?: string }) => {
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2 - curve;
  const path = curve !== 0 
    ? `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`
    : `M ${startX} ${startY} L ${endX} ${endY}`;

  // Arrowhead math
  const angle = Math.atan2(endY - midY, endX - midX);
  const headLen = 8;
  const a1 = angle - Math.PI / 6;
  const a2 = angle + Math.PI / 6;
  const h1X = endX - headLen * Math.cos(a1);
  const h1Y = endY - headLen * Math.sin(a1);
  const h2X = endX - headLen * Math.cos(a2);
  const h2Y = endY - headLen * Math.sin(a2);

  return (
    <g>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeDasharray="4,4" className="animate-pulse" />
      <polygon points={`${endX},${endY} ${h1X},${h1Y} ${h2X},${h2Y}`} fill={color} />
      {label && (
        <text x={midX} y={midY - 5} fill={color} fontSize="12" textAnchor="middle" className="font-mono bg-white">
          {label}
        </text>
      )}
    </g>
  );
};

// --- Pattern Visualizers ---

const LineVisualizer = ({ step }: { step: number }) => {
  const n = 6;
  const boxWidth = 40;
  const spacing = 20;
  const startX = 50;
  const y = 100;

  const currentIdx = Math.min(step + 2, n - 1);
  const activeColor = "#3b82f6"; // blue-500
  const depColor = "#8b5cf6"; // violet-500
  const solvedColor = "#10b981"; // emerald-500
  const emptyColor = "#e2e8f0"; // slate-200

  return (
    <svg width="100%" height="200" viewBox="0 0 450 200" className="bg-white rounded-lg border border-slate-200 shadow-inner">
      <text x="20" y="30" className="text-sm font-semibold fill-slate-500 uppercase tracking-wider">Transition State Graph</text>
      
      {Array.from({ length: n }).map((_, i) => {
        const cx = startX + i * (boxWidth + spacing);
        let fill = emptyColor;
        let stroke = "#cbd5e1";
        if (i < currentIdx) fill = solvedColor;
        if (i === currentIdx) fill = activeColor;
        if (i === currentIdx - 1 || i === currentIdx - 2) stroke = depColor;

        return (
          <g key={i}>
            <rect x={cx} y={y} width={boxWidth} height={boxWidth} rx="6" fill={fill} stroke={stroke} strokeWidth="3" 
                  className="transition-colors duration-300" />
            <text x={cx + boxWidth/2} y={y + boxWidth/2 + 5} textAnchor="middle" fill={fill === emptyColor ? "#64748b" : "white"} className="font-mono font-bold">
              i={i}
            </text>
          </g>
        );
      })}

      {currentIdx > 1 && (
        <>
          <Arrow 
            startX={startX + (currentIdx - 1) * (boxWidth + spacing) + boxWidth / 2} startY={y - 5}
            endX={startX + currentIdx * (boxWidth + spacing) + boxWidth / 2} endY={y - 5}
            curve={30} color={depColor} label="f(i-1)"
          />
          <Arrow 
            startX={startX + (currentIdx - 2) * (boxWidth + spacing) + boxWidth / 2} startY={y - 5}
            endX={startX + currentIdx * (boxWidth + spacing) + boxWidth / 2} endY={y - 5}
            curve={60} color={depColor} label="f(i-2)"
          />
        </>
      )}
    </svg>
  );
};

const GridVisualizer = ({ step }: { step: number }) => {
  const rows = 4;
  const cols = 5;
  const size = 40;
  const startX = 80;
  const startY = 40;

  const totalSteps = (rows - 1) + (cols - 1);
  const currentStep = Math.min(step + 1, totalSteps);
  
  // Calculate current active cell moving diagonally
  const activeR = Math.min(currentStep, rows - 1);
  const activeC = Math.min(currentStep, cols - 1);

  return (
    <svg width="100%" height="240" viewBox="0 0 450 240" className="bg-white rounded-lg border border-slate-200 shadow-inner">
      <text x="20" y="25" className="text-sm font-semibold fill-slate-500 uppercase tracking-wider">2D State Matrix</text>
      
      {Array.from({ length: rows }).map((_, r) => 
        Array.from({ length: cols }).map((_, c) => {
          const x = startX + c * size;
          const y = startY + r * size;
          
          let fill = "#f8fafc";
          if (r === 0 || c === 0) fill = "#d1fae5"; // emerald-100 base cases
          if (r <= activeR && c <= activeC && !(r===0 || c===0)) fill = "#e0e7ff"; // indigo-100 solved
          if (r === activeR && c === activeC && r !== 0 && c !== 0) fill = "#3b82f6"; // blue-500 active
          
          return (
            <rect key={`${r}-${c}`} x={x} y={y} width={size} height={size} fill={fill} stroke="#cbd5e1" strokeWidth="1" className="transition-all duration-300"/>
          );
        })
      )}

      {/* Dependency Arrows for active cell */}
      {activeR > 0 && activeC > 0 && (
        <>
          {/* From Top */}
          <Arrow 
            startX={startX + activeC * size + size/2} startY={startY + (activeR-1) * size + size - 5}
            endX={startX + activeC * size + size/2} endY={startY + activeR * size + 5}
            color="#8b5cf6"
          />
          {/* From Left */}
          <Arrow 
            startX={startX + (activeC-1) * size + size - 5} startY={startY + activeR * size + size/2}
            endX={startX + activeC * size + 5} endY={startY + activeR * size + size/2}
            color="#8b5cf6"
          />
        </>
      )}
    </svg>
  );
};

const SubsequenceVisualizer = ({ step }: { step: number }) => {
  const str1 = " AXB";
  const str2 = " YXB";
  const size = 35;
  const startX = 100;
  const startY = 50;

  // Let's animate a specific diagonal match state
  const states = [
    { r: 1, c: 1, match: false }, // A vs Y
    { r: 2, c: 2, match: true },  // X vs X
    { r: 3, c: 2, match: false }, // B vs X
    { r: 3, c: 3, match: true },  // B vs B
  ];
  
  const currentState = states[step % states.length];

  return (
    <svg width="100%" height="220" viewBox="0 0 450 220" className="bg-white rounded-lg border border-slate-200 shadow-inner">
      <text x="20" y="25" className="text-sm font-semibold fill-slate-500 uppercase tracking-wider">String Matrix</text>
      
      {/* Strings */}
      {str1.split('').map((char, i) => (
        <text key={`col-${i}`} x={startX + i * size + size/2} y={startY - 10} textAnchor="middle" className="font-mono font-bold fill-slate-700">{char}</text>
      ))}
      {str2.split('').map((char, i) => (
        <text key={`row-${i}`} x={startX - 15} y={startY + i * size + size/2 + 5} textAnchor="middle" className="font-mono font-bold fill-slate-700">{char}</text>
      ))}

      {/* Grid */}
      {str2.split('').map((_, r) => 
        str1.split('').map((_, c) => {
          const x = startX + c * size;
          const y = startY + r * size;
          
          let fill = "#f8fafc";
          if (r === 0 || c === 0) fill = "#f1f5f9"; // zero cases
          if (r === currentState.r && c === currentState.c) fill = currentState.match ? "#10b981" : "#f43f5e"; // green/red
          
          return (
             <g key={`${r}-${c}`}>
              <rect x={x} y={y} width={size} height={size} fill={fill} stroke="#e2e8f0" />
              {r>0 && c>0 && fill !== "#f8fafc" && (
                <text x={x+size/2} y={y+size/2+4} textAnchor="middle" fill="white" fontSize="12" className="font-mono">
                  {currentState.match ? "+1" : "max"}
                </text>
              )}
             </g>
          );
        })
      )}

      {/* Arrows */}
      {currentState.r > 0 && currentState.c > 0 && (
        currentState.match ? (
          <Arrow 
            startX={startX + (currentState.c-1)*size + size/2} startY={startY + (currentState.r-1)*size + size/2}
            endX={startX + currentState.c*size + size/2 - 10} endY={startY + currentState.r*size + size/2 - 10}
            color="#059669"
          />
        ) : (
          <>
            <Arrow 
              startX={startX + currentState.c*size + size/2} startY={startY + (currentState.r-1)*size + size/2}
              endX={startX + currentState.c*size + size/2} endY={startY + currentState.r*size + size/4}
              color="#e11d48"
            />
            <Arrow 
              startX={startX + (currentState.c-1)*size + size/2} startY={startY + currentState.r*size + size/2}
              endX={startX + currentState.c*size + size/4} endY={startY + currentState.r*size + size/2}
              color="#e11d48"
            />
          </>
        )
      )}
    </svg>
  );
};

const IntervalVisualizer = ({ step }: { step: number }) => {
  const items = ["A", "B", "C", "D"];
  const width = 60;
  const startX = 80;
  const y = 160;

  // Animate the split point k for interval [0, 3]
  const k = step % 3; 

  return (
    <svg width="100%" height="240" viewBox="0 0 450 240" className="bg-white rounded-lg border border-slate-200 shadow-inner">
      <text x="20" y="25" className="text-sm font-semibold fill-slate-500 uppercase tracking-wider">Sub-interval Evaluation</text>
      
      {/* Base Elements */}
      {items.map((item, i) => (
        <g key={i}>
          <rect x={startX + i*width} y={y} width={width-4} height={40} rx="4" fill="#f1f5f9" stroke="#cbd5e1" />
          <text x={startX + i*width + width/2 - 2} y={y + 25} textAnchor="middle" className="font-mono font-bold fill-slate-700">{item}</text>
        </g>
      ))}

      {/* Main Interval Bracket */}
      <path d={`M ${startX} ${y-10} L ${startX} ${y-20} L ${startX + 4*width - 4} ${y-20} L ${startX + 4*width - 4} ${y-10}`} fill="none" stroke="#94a3b8" strokeWidth="2" />
      <text x={startX + 2*width} y={y-30} textAnchor="middle" className="font-mono text-xs fill-slate-500">Interval [i, j]</text>

      {/* Split Brackets */}
      <path d={`M ${startX} ${y-50} L ${startX} ${y-60} L ${startX + (k+1)*width - 4} ${y-60} L ${startX + (k+1)*width - 4} ${y-50}`} fill="none" stroke="#6366f1" strokeWidth="3" className="transition-all duration-300"/>
      <text x={startX + ((k+1)*width)/2} y={y-70} textAnchor="middle" className="font-mono text-xs font-bold fill-indigo-600 transition-all duration-300">Left: [i, k]</text>

      <path d={`M ${startX + (k+1)*width} ${y-50} L ${startX + (k+1)*width} ${y-60} L ${startX + 4*width - 4} ${y-60} L ${startX + 4*width - 4} ${y-50}`} fill="none" stroke="#f59e0b" strokeWidth="3" className="transition-all duration-300"/>
      <text x={startX + (k+1)*width + ((3-k)*width)/2} y={y-70} textAnchor="middle" className="font-mono text-xs font-bold fill-amber-600 transition-all duration-300">Right: [k+1, j]</text>

      {/* Split Point Marker */}
      <line x1={startX + (k+1)*width - 2} y1={y-80} x2={startX + (k+1)*width - 2} y2={y} stroke="#ef4444" strokeWidth="2" strokeDasharray="4,4" />
      <text x={startX + (k+1)*width - 2} y={y-90} textAnchor="middle" className="font-mono font-bold fill-red-500">Split k={k}</text>

    </svg>
  );
};

// --- Main Data ---

type PatternData = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  equation: React.ReactNode;
  examples: string[];
  visualizer: React.FC<{step: number}>;
  maxSteps: number;
  color: string;
};

const patterns: PatternData[] = [
  {
    id: "line",
    name: "1D Line / Array",
    subtitle: "Linear Sequence Dependency",
    description: "The state depends entirely on a fixed number of previous states in a 1D sequence. Often used when the problem can be broken down into steps along a single dimension.",
    equation: (
      <span><span className="text-blue-600 font-bold">dp[i]</span> = <span className="text-slate-500">f(</span><span className="text-indigo-600">dp[i-1]</span>, <span className="text-indigo-600">dp[i-2]</span><span className="text-slate-500">)</span></span>
    ),
    examples: ["Fibonacci Sequence", "Climbing Stairs", "House Robber"],
    visualizer: LineVisualizer,
    maxSteps: 5,
    color: "bg-blue-50 border-blue-200 text-blue-800"
  },
  {
    id: "grid",
    name: "2D Grid / Matrix",
    subtitle: "Spatial Dependency",
    description: "The state is represented by a 2D matrix where each cell typically depends on its adjacent neighbors (usually top and left) moving towards a target.",
    equation: (
      <span><span className="text-blue-600 font-bold">dp[i][j]</span> = <span className="text-slate-500">f(</span><span className="text-indigo-600">dp[i-1][j]</span>, <span className="text-indigo-600">dp[i][j-1]</span><span className="text-slate-500">)</span></span>
    ),
    examples: ["Unique Paths", "Minimum Path Sum", "Dungeon Game"],
    visualizer: GridVisualizer,
    maxSteps: 8,
    color: "bg-emerald-50 border-emerald-200 text-emerald-800"
  },
  {
    id: "subsequence",
    name: "Two Sequences",
    subtitle: "String/Array Comparison",
    description: "Involves two strings or arrays. The state represents the relationship between a prefix of the first and a prefix of the second sequence. Dependencies are often diagonal.",
    equation: (
      <div className="flex flex-col text-sm">
        <span>If match: <span className="text-blue-600 font-bold">dp[i][j]</span> = <span className="text-indigo-600">dp[i-1][j-1]</span> + 1</span>
        <span>Else: <span className="text-blue-600 font-bold">dp[i][j]</span> = max(<span className="text-indigo-600">dp[i-1][j]</span>, <span className="text-indigo-600">dp[i][j-1]</span>)</span>
      </div>
    ),
    examples: ["Longest Common Subsequence", "Edit Distance", "Interleaving String"],
    visualizer: SubsequenceVisualizer,
    maxSteps: 4,
    color: "bg-rose-50 border-rose-200 text-rose-800"
  },
  {
    id