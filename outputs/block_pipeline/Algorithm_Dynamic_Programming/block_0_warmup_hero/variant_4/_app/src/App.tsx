import React, { useState, useEffect } from 'react';
import { ArrowRight, BrainCircuit, Layers, Activity, Zap, CheckCircle2 } from 'lucide-react';

// --- Hero Visualization Data ---
const treeNodes = [
  { id: 'n1', label: 'F(4)', x: 200, y: 40, level: 0 },
  { id: 'n2', label: 'F(3)', x: 100, y: 100, level: 1 },
  { id: 'n3', label: 'F(2)', x: 300, y: 100, level: 1, duplicate: true },
  { id: 'n4', label: 'F(2)', x: 50, y: 160, level: 2, duplicate: true },
  { id: 'n5', label: 'F(1)', x: 150, y: 160, level: 2, duplicate: true },
  { id: 'n6', label: 'F(1)', x: 250, y: 160, level: 2, duplicate: true },
  { id: 'n7', label: 'F(0)', x: 350, y: 160, level: 2 },
  { id: 'n8', label: 'F(1)', x: 20, y: 220, level: 3, duplicate: true },
  { id: 'n9', label: 'F(0)', x: 80, y: 220, level: 3 },
];

const treeEdges = [
  { from: 'n1', to: 'n2' }, { from: 'n1', to: 'n3' },
  { from: 'n2', to: 'n4' }, { from: 'n2', to: 'n5' },
  { from: 'n3', to: 'n6' }, { from: 'n3', to: 'n7' },
  { from: 'n4', to: 'n8' }, { from: 'n4', to: 'n9' },
];

const dpNodes = [
  { id: 'd0', label: 'F(0)', x: 40, y: 140, val: 0 },
  { id: 'd1', label: 'F(1)', x: 120, y: 140, val: 1 },
  { id: 'd2', label: 'F(2)', x: 200, y: 140, val: 1 },
  { id: 'd3', label: 'F(3)', x: 280, y: 140, val: 2 },
  { id: 'd4', label: 'F(4)', x: 360, y: 140, val: 3 },
];

const dpEdges = [
  { from: 'd0', to: 'd2' }, { from: 'd1', to: 'd2' },
  { from: 'd1', to: 'd3' }, { from: 'd2', to: 'd3' },
  { from: 'd2', to: 'd4' }, { from: 'd3', to: 'd4' },
];

export default function App() {
  const [isOptimized, setIsOptimized] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  // Animation effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (!isOptimized) {
      // Animate naive tree
      let step = 0;
      const sequence = ['n1', 'n2', 'n4', 'n8', 'n9', 'n5', 'n3', 'n6', 'n7'];
      interval = setInterval(() => {
        setActiveNode(sequence[step % sequence.length]);
        step++;
      }, 600);
    } else {
      // Animate DP table
      let step = 0;
      const sequence = ['d0', 'd1', 'd2', 'd3', 'd4'];
      interval = setInterval(() => {
        setActiveNode(sequence[step % sequence.length]);
        step++;
      }, 600);
    }
    return () => clearInterval(interval);
  }, [isOptimized]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Navbar */}
      <nav className="w-full bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl tracking-tight">
          <BrainCircuit className="w-6 h-6" />
          <span>DPLab</span>
        </div>
        <div className="hidden md:flex gap-6 text-sm font-medium text-slate-500">
          <a href="#memoization" className="hover:text-indigo-600 transition-colors">Memoization</a>
          <a href="#tabulation" className="hover:text-indigo-600 transition-colors">Tabulation</a>
          <a href="#patterns" className="hover:text-indigo-600 transition-colors">Patterns</a>
        </div>
      </nav>

      {/* Main Hero Section */}
      <main className="flex-grow flex items-center justify-center p-6 md:p-12">
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Left Column: Copy & CTA */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold tracking-wide">
                <Zap className="w-4 h-4" />
                <span>CS301 Algorithm Visualizer</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                Stop recomputing <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
                  the past.
                </span>
              </h1>
              
              <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
                Dynamic Programming transforms exponential nightmares into linear dreams. Master <strong>overlapping subproblems</strong> and <strong>optimal substructure</strong> through interactive visual traces.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm">
                <Layers className="w-4 h-4 text-emerald-500" />
                Memoization
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm">
                <Activity className="w-4 h-4 text-blue-500" />
                Tabulation
              </div>
            </div>

            <button 
              onClick={() => setIsStarted(true)}
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl overflow-hidden transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/20 active:scale-95"
            >
              <span className="relative z-10">{isStarted ? "Loading Lab Modules..." : "Enter the Lab"}</span>
              {isStarted ? (
                <BrainCircuit className="w-5 h-5 relative z-10 animate-pulse" />
              ) : (
                <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              )}
            </button>
          </div>

          {/* Right Column: Interactive Visualizer */}
          <div className="relative w-full aspect-square md:aspect-video lg:aspect-square bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col overflow-hidden">
            
            {/* Visualizer Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
              <div className="text-sm font-semibold tracking-tight text-slate-700">
                Core Concept: Computing Fibonacci
              </div>
              
              {/* Toggle Switch */}
              <div className="flex p-1 bg-slate-200/70 rounded-lg">
                <button
                  onClick={() => setIsOptimized(false)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    !isOptimized 
                      ? 'bg-white text-rose-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Naive
                </button>
                <button
                  onClick={() => setIsOptimized(true)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    isOptimized 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Optimized
                </button>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-grow relative flex items-center justify-center bg-white p-6">
              <svg width="100%" height="100%" viewBox="0 0 400 300" className="overflow-visible">
                {/* Render Naive Tree */}
                {!isOptimized && (
                  <g className="transition-opacity duration-500 opacity-100">
                    {/* Edges */}
                    {treeEdges.map((edge, i) => {
                      const fromNode = treeNodes.find(n => n.id === edge.from)!;
                      const toNode = treeNodes.find(n => n.id === edge.to)!;
                      const isActive = activeNode === fromNode.id || activeNode === toNode.id;
                      return (
                        <line
                          key={i}
                          x1={fromNode.x} y1={fromNode.y}
                          x2={toNode.x} y2={toNode.y}
                          stroke={isActive ? '#f43f5e' : '#cbd5e1'}
                          strokeWidth={isActive ? 3 : 1.5}
                          className="transition-all duration-300"
                        />
                      );
                    })}
                    {/* Nodes */}
                    {treeNodes.map((node) => {
                      const isActive = activeNode === node.id;
                      const isDup = node.duplicate;
                      return (
                        <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                          <circle
                            r="16"
                            fill={isActive ? '#fef2f2' : '#ffffff'}
                            stroke={isActive ? '#f43f5e' : (isDup ? '#f59e0b' : '#94a3b8')}
                            strokeWidth={isActive ? 3 : 2}
                            className="transition-all duration-300"
                          />
                          {isActive && (
                            <circle r="22" fill="none" stroke="#f43f5e" strokeWidth="2" opacity="0.4" className="animate-ping" />
                          )}
                          <text x="0" y="4" fontSize="10" textAnchor="middle" fill={isActive ? '#9f1239' : '#334155'} fontWeight="bold">
                            {node.label}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* Render DP Table */}
                {isOptimized && (
                  <g className="transition-opacity duration-500 opacity-100">
                    {/* Edges */}
                    {dpEdges.map((edge, i) => {
                      const fromNode = dpNodes.find(n => n.id === edge.from)!;
                      const toNode = dpNodes.find(n => n.id === edge.to)!;
                      const isActive = activeNode === toNode.id;
                      return (
                        <path
                          key={i}
                          d={`M ${fromNode.x} ${fromNode.y - 16} Q ${(fromNode.x + toNode.x)/2} ${fromNode.y - 60} ${toNode.x} ${toNode.y - 20}`}
                          fill="none"
                          stroke={isActive ? '#4f46e5' : '#e2e8f0'}
                          strokeWidth={isActive ? 2.5 : 1.5}
                          strokeDasharray={isActive ? '0' : '4 4'}
                          markerEnd="url(#arrowhead)"
                          className="transition-all duration-300"
                        />
                      );
                    })}
                    
                    {/* Arrow Marker Definition */}
                    <defs>
                      <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                        <polygon points="0 0, 6 2, 0 4" fill="#cbd5e1" />
                      </marker>
                    </defs>

                    {/* Nodes (Table Cells) */}
                    {dpNodes.map((node, i) => {
                      const isActive = activeNode === node.id;
                      const isComputed = dpNodes.findIndex(n => n.id === activeNode) >= i;
                      
                      return (
                        <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                          {/* Array Box */}
                          <rect
                            x="-24" y="-24" width="48" height="48" rx="8"
                            fill={isActive ? '#eef2ff' : (isComputed ? '#f8fafc' : '#ffffff')}
                            stroke={isActive ? '#4f46e5' : (isComputed ? '#94a3b8' : '#e2e8f0')}
                            strokeWidth={isActive ? 3 : 2}
                            className="transition-all duration-300"
                          />
                          {isActive && (
                            <rect x="-28" y="-28" width="56" height="56" rx="10" fill="none" stroke="#4f46e5" strokeWidth="2" opacity="0.4" className="animate-ping" />
                          )}
                          <text x="0" y="-4" fontSize="12" textAnchor="middle" fill="#64748b" fontWeight="semibold">
                            {node.label}
                          </text>
                          <text x="0" y="14" fontSize="14" textAnchor="middle" fill={isActive ? '#3730a3' : (isComputed ? '#0f172a' : '#cbd5e1')} fontWeight="bold">
                            {isComputed ? node.val : '?'}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}
              </svg>
            </div>

            {/* Visualizer Footer Explainer */}
            <div className="bg-white border-t border-slate-100 p-5 min-h-[100px] flex items-start gap-4">
              <div className={`p-2 rounded-full mt-0.5 ${!isOptimized ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {!isOptimized ? <Activity className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              </div>
              <div>
                <h3 className={`font-bold ${!isOptimized ? 'text-rose-900' : 'text-indigo-900'}`}>
                  {!isOptimized ? 'Exponential Explosion: O(2ⁿ)' : 'Linear Time: O(n)'}
                </h3>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  {!isOptimized 
                    ? "Notice the duplicated work? F(2) and F(1) are calculated multiple times. As n grows, the call tree expands exponentially." 
                    : "By storing previously computed answers in a table (or array), we simply reuse them. The problem collapses into a straight line."}
                </p>
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}

// Runtime deps: lucide-react@latest