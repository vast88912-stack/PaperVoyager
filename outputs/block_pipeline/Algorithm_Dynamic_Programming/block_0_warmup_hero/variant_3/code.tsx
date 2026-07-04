import React, { useState, useEffect, useRef } from 'react';

// --- DATA & TYPES ---

type Node = {
  id: string;
  x: number;
  y: number;
  label: string;
};

type Edge = {
  id: string;
  from: string;
  to: string;
};

type SimulationStep = {
  activeNode: string | null;
  activeEdge: string | null;
  computed: string[];
  cacheHit: string | null;
  message: string;
  metricWork: number;
  metricSaved: number;
};

const NODES: Node[] = [
  { id: 'A', x: 200, y: 40, label: 'f(A)' },
  { id: 'B', x: 100, y: 140, label: 'f(B)' },
  { id: 'C', x: 300, y: 140, label: 'f(C)' },
  { id: 'D', x: 50, y: 260, label: 'f(D)' },
  { id: 'E', x: 200, y: 260, label: 'f(E)' },
  { id: 'F', x: 350, y: 260, label: 'f(F)' },
];

const EDGES: Edge[] = [
  { id: 'A-B', from: 'A', to: 'B' },
  { id: 'A-C', from: 'A', to: 'C' },
  { id: 'B-D', from: 'B', to: 'D' },
  { id: 'B-E', from: 'B', to: 'E' },
  { id: 'C-E', from: 'C', to: 'E' },
  { id: 'C-F', from: 'C', to: 'F' },
];

const DP_SEQUENCE: SimulationStep[] = [
  { activeNode: null, activeEdge: null, computed: [], cacheHit: null, message: "System ready. Press play to compute f(A).", metricWork: 0, metricSaved: 0 },
  { activeNode: 'A', activeEdge: null, computed: [], cacheHit: null, message: "Initialize computation for f(A).", metricWork: 1, metricSaved: 0 },
  { activeNode: 'B', activeEdge: 'A-B', computed: [], cacheHit: null, message: "Decompose into subproblem f(B).", metricWork: 2, metricSaved: 0 },
  { activeNode: 'D', activeEdge: 'B-D', computed: [], cacheHit: null, message: "Decompose f(B) into f(D).", metricWork: 3, metricSaved: 0 },
  { activeNode: 'D', activeEdge: null, computed: ['D'], cacheHit: null, message: "Base case f(D) reached. Store in cache.", metricWork: 4, metricSaved: 0 },
  { activeNode: 'B', activeEdge: null, computed: ['D'], cacheHit: null, message: "Return to f(B).", metricWork: 4, metricSaved: 0 },
  { activeNode: 'E', activeEdge: 'B-E', computed: ['D'], cacheHit: null, message: "Decompose f(B) into f(E).", metricWork: 5, metricSaved: 0 },
  { activeNode: 'E', activeEdge: null, computed: ['D', 'E'], cacheHit: null, message: "Base case f(E) reached. Store in cache.", metricWork: 6, metricSaved: 0 },
  { activeNode: 'B', activeEdge: null, computed: ['D', 'E', 'B'], cacheHit: null, message: "f(B) fully computed. Store in cache.", metricWork: 7, metricSaved: 0 },
  { activeNode: 'A', activeEdge: null, computed: ['D', 'E', 'B'], cacheHit: null, message: "Return to root f(A).", metricWork: 7, metricSaved: 0 },
  { activeNode: 'C', activeEdge: 'A-C', computed: ['D', 'E', 'B'], cacheHit: null, message: "Decompose into right subproblem f(C).", metricWork: 8, metricSaved: 0 },
  { activeNode: 'E', activeEdge: 'C-E', computed: ['D', 'E', 'B'], cacheHit: null, message: "f(C) needs f(E). Checking cache...", metricWork: 9, metricSaved: 0 },
  { activeNode: 'E', activeEdge: 'C-E', computed: ['D', 'E', 'B'], cacheHit: 'E', message: "Cache Hit! f(E) retrieved in O(1) time.", metricWork: 9, metricSaved: 1 },
  { activeNode: 'C', activeEdge: null, computed: ['D', 'E', 'B'], cacheHit: null, message: "Return to f(C), bypassing redundant tree.", metricWork: 9, metricSaved: 1 },
  { activeNode: 'F', activeEdge: 'C-F', computed: ['D', 'E', 'B'], cacheHit: null, message: "Decompose f(C) into f(F).", metricWork: 10, metricSaved: 1 },
  { activeNode: 'F', activeEdge: null, computed: ['D', 'E', 'B', 'F'], cacheHit: null, message: "Base case f(F) reached. Store in cache.", metricWork: 11, metricSaved: 1 },
  { activeNode: 'C', activeEdge: null, computed: ['D', 'E', 'B', 'F', 'C'], cacheHit: null, message: "f(C) fully computed. Store in cache.", metricWork: 12, metricSaved: 1 },
  { activeNode: 'A', activeEdge: null, computed: ['D', 'E', 'B', 'F', 'C', 'A'], cacheHit: null, message: "Root f(A) solved optimally!", metricWork: 13, metricSaved: 1 },
];

// --- COMPONENTS ---

export default function App() {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStep = DP_SEQUENCE[stepIndex];

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setStepIndex((prev) => {
          if (prev >= DP_SEQUENCE.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1200); // 1.2s per step for readability
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  const handleReset = () => {
    setIsPlaying(false);
    setStepIndex(0);
  };

  const handlePlayPause = () => {
    if (stepIndex === DP_SEQUENCE.length - 1) {
      setStepIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  // Helper to determine node styles based on state
  const getNodeStyle = (id: string) => {
    const isComputed = currentStep.computed.includes(id);
    const isActive = currentStep.activeNode === id;
    const isCacheHit = currentStep.cacheHit === id;

    let fill = 'white';
    let stroke = '#cbd5e1'; // slate-300
    let text = '#64748b'; // slate-500
    let classes = 'transition-all duration-500 ease-out';

    if (isCacheHit) {
      fill = '#fef08a'; // yellow-200
      stroke = '#eab308'; // yellow-500
      text = '#854d0e'; // yellow-800
      classes += ' drop-shadow-[0_0_12px_rgba(234,179,8,0.6)] scale-110';
    } else if (isActive) {
      fill = '#e0e7ff'; // indigo-100
      stroke = '#6366f1'; // indigo-500
      text = '#4338ca'; // indigo-700
      classes += ' drop-shadow-md scale-105';
    } else if (isComputed) {
      fill = '#dcfce7'; // green-100
      stroke = '#22c55e'; // green-500
      text = '#15803d'; // green-700
    }

    return { fill, stroke, text, classes };
  };

  // Helper for edge styles
  const getEdgeStyle = (id: string, toNode: string) => {
    const isActive = currentStep.activeEdge === id;
    const isToComputed = currentStep.computed.includes(toNode);
    
    let stroke = '#e2e8f0'; // slate-200
    let width = 2;
    let classes = 'transition-all duration-500';

    if (isActive) {
      stroke = '#6366f1'; // indigo-500
      width = 3;
      classes += ' drop-shadow-sm';
    } else if (isToComputed && currentStep.activeNode !== 'A' && currentStep.activeNode !== 'B' && currentStep.activeNode !== 'C') {
        // slightly highlight edges of completed subtrees purely for aesthetics,
        // but keeping it simple: just dim if not active
    }

    return { stroke, width, classes };
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-200 flex flex-col items-center justify-center p-6">
      
      {/* Container */}
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Column: Text & CTA */}
        <div className="space-y-8 z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold tracking-wide uppercase">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              <span>CS-412 • Algorithmic Paradigms</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Don't compute the <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">
                same thing twice.
              </span>
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
              Dynamic Programming (DP) optimizes recursive problems by storing the results of overlapping subproblems. Watch how naive exponential branching collapses into efficient table lookups.
            </p>
          </div>

          {/* Interactive Controls & Metrics (Desktop) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 max-w-lg">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Simulation Controls</h3>
                <span className="text-xs font-mono text-slate-400">Step {stepIndex}/{DP_SEQUENCE.length - 1}</span>
             </div>
             
             <div className="flex space-x-3 mb-6">
                <button 
                  onClick={handlePlayPause}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 shadow-sm"
                >
                  {isPlaying ? (
                    <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>Pause</span></>
                  ) : (
                    <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>{stepIndex === 0 ? 'Start Trace' : 'Resume'}</span></>
                  )}
                </button>
                <button 
                  onClick={() => { setStepIndex(Math.max(0, stepIndex - 1)); setIsPlaying(false); }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                  disabled={stepIndex === 0}
                  aria-label="Step Backward"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button 
                  onClick={() => { setStepIndex(Math.min(DP_SEQUENCE.length - 1, stepIndex + 1)); setIsPlaying(false); }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                  disabled={stepIndex === DP_SEQUENCE.length - 1}
                  aria-label="Step Forward"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <button 
                  onClick={handleReset}
                  className="px-3 py-2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Reset"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
             </div>

             {/* Live Metrics */}
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Operations</div>
                  <div className="text-2xl font-mono font-semibold text-slate-800">{currentStep.metricWork}</div>
                </div>
                <div className="bg-emerald-50 p-3 rounded-md border border-emerald-100">
                  <div className="text-xs text-emerald-600 uppercase tracking-wider mb-1">Redundant Trees Pruned</div>
                  <div className="text-2xl font-mono font-semibold text-emerald-700">{currentStep.metricSaved}</div>
                </div>
             </div>
          </div>

          <div className="pt-2">
            <button className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors flex items-center space-x-1">
              <span>Skip to Lab Modules</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            </button>
          </div>
        </div>

        {/* Right Column: Visualizer */}
        <div className="relative w-full aspect-square md:aspect-[4/3] bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden flex flex-col">
          
          {/* Visualizer Header */}
          <div className="h