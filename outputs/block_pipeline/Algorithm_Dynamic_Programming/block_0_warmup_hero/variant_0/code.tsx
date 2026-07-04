import React, { useState, useEffect } from 'react';
import { BrainCircuit, Zap, ArrowRight, GitMerge, Layers, Play, Pause, RotateCcw, Cpu } from 'lucide-react';

export default function App() {
  const [n, setN] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);

  // Simulate the exponential vs linear growth
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setN((prev) => (prev >= 30 ? 1 : prev + 1));
    }, 200);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const naiveOps = Math.pow(2, n) - 1;
  const dpOps = n;

  const formatNumber = (num: number) => {
    if (num > 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num > 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden flex flex-col">
      {/* Background Grid Pattern for "Lab" feel */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" 
           style={{ backgroundImage: 'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-8 flex justify-between items-center">
        <div className="flex items-center gap-2 text-indigo-700 font-bold text-xl tracking-tight">
          <BrainCircuit className="w-6 h-6" />
          <span>DPLab</span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
          <a href="#" className="hover:text-indigo-600 transition-colors">Concepts</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">Patterns</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">Visualizers</a>
        </nav>
      </header>

      {/* Main Hero Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-6xl mx-auto w-full">
        
        {/* Title Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-6">
            <Zap className="w-4 h-4" />
            <span>Algorithm Optimization</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
            Those who cannot remember the past are condemned to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">recompute it.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed">
            Dynamic Programming (DP) is a method for solving complex problems by breaking them down into simpler subproblems. It is the ultimate trade-off: using memory to save time.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5">
              Start Module 1: Fibonacci
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-semibold transition-all shadow-sm">
              Browse Pattern Library
            </button>
          </div>
        </div>

        {/* Interactive Demo & Pillars */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
          
          {/* The "Why DP?" Visualizer */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                The Power of Memoization
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button onClick={() => setN(1)} className="p-2 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="p-8 flex-1 flex flex-col">
              <div className="mb-8 text-center">
                <p className="text-sm text-slate-500 font-medium uppercase tracking-widest mb-1">Input Size (N)</p>
                <div className="text-4xl font-black text-slate-800 font-mono">{n}</div>
              </div>

              <div className="grid grid-cols-2 gap-8 flex-1">
                {/* Naive Approach */}
                <div className="flex flex-col items-center justify-end relative">
                  <div className="w-full bg-slate-100 rounded-t-lg flex flex-col justify-end overflow-hidden relative h-48">
                    <div 
                      className="w-full bg-red-400 transition-all duration-200 ease-linear"
                      style={{ height: `${Math.min(100, (naiveOps / 1000) * 100)}%` }}
                    />
                    {naiveOps > 10000 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 backdrop-blur-[1px]">
                        <span className="text-red-600 font-bold text-sm bg-white/90 px-2 py-1 rounded shadow-sm animate-pulse">
                          Stack Overflow Risk
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    <h4 className="font-semibold text-slate-800">Naive Recursion</h4>
                    <p className="text-xs text-slate-500 mb-1">O(2ⁿ) Time</p>
                    <div className={`font-mono font-bold text-lg ${naiveOps > 10000 ? 'text-red-500' : 'text-slate-700'}`}>
                      {formatNumber(naiveOps)} ops
                    </div>
                  </div>
                </div>

                {/* DP Approach */}
                <div className="flex flex-col items-center justify-end relative">
                  <div className="w-full bg-slate-100 rounded-t-lg flex flex-col justify-end overflow-hidden h-48">
                    <div 
                      className="w-full bg-indigo-500 transition-all duration-200 ease-linear"
                      style={{ height: `${Math.min(100, (dpOps / 30) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <h4 className="font-semibold text-slate-800">Dynamic Programming</h4>
                    <p className="text-xs text-slate-500 mb-1">O(n) Time</p>
                    <div className="font-mono font-bold text-lg text-indigo-600">
                      {formatNumber(dpOps)} ops
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* The Two Pillars */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <GitMerge className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Overlapping Subproblems</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                The problem can be broken down into smaller, identical problems. Instead of solving the same subproblem multiple times, DP solves it once and stores the result (Memoization/Tabulation).
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Optimal Substructure</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                The optimal solution to the main problem can be constructed efficiently from the optimal solutions of its subproblems. If this holds true, DP is your best tool.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

// Runtime deps: lucide-react@latest