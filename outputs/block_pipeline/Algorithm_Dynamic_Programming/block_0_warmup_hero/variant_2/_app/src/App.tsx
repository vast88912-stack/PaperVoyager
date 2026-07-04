import React, { useState, useEffect } from 'react';
import { Play, ArrowRight, Zap, BrainCircuit, Activity, BookOpen, Clock, AlertTriangle } from 'lucide-react';

// Helper to calculate actual number of function calls in naive Fibonacci
const getNaiveCalls = (n: number): number => {
  if (n <= 1) return 1;
  let a = 1, b = 1, c = 1;
  for (let i = 2; i <= n; i++) {
    c = a + b + 1;
    a = b;
    b = c;
  }
  return c;
};

export default function App() {
  const [n, setN] = useState<number>(5);
  const [animatedNaive, setAnimatedNaive] = useState<number>(0);

  const naiveCalls = getNaiveCalls(n);
  const dpCalls = n === 0 ? 1 : n; // Memoized calls: exactly n (plus base cases, simplified here to n for visual clarity)

  // Animate the exponential counter for dramatic effect
  useEffect(() => {
    let start = animatedNaive;
    const end = naiveCalls;
    if (start === end) return;

    const duration = 400; 
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for dramatic spin-up
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setAnimatedNaive(Math.floor(start + (end - start) * easeOutQuart));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setAnimatedNaive(end);
      }
    };
    requestAnimationFrame(animate);
  }, [n, naiveCalls]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 flex flex-col relative overflow-hidden">
      
      {/* Subtle background pattern for "Lab" feel */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.4]"
        style={{ 
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', 
          backgroundSize: '24px 24px' 
        }}
      />

      {/* Top Navigation / Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-md">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-800">
            CS-401 <span className="text-slate-400 font-normal mx-1">|</span> Dynamic Programming Lab
          </span>
        </div>
        <div className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Module 01: Warmup
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 lg:py-20 flex flex-col lg:flex-row items-center gap-16 relative z-0">
        
        {/* Left Column: Copy & CTA */}
        <div className="flex-1 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold tracking-wide">
              <Zap className="w-4 h-4" />
              Algorithmic Optimization
            </div>
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
              Taming the <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">Exponential Explosion.</span>
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
              Dynamic Programming (DP) is a systematic method for solving complex problems by breaking them down into simpler subproblems. By remembering past computations, we transform impossible exponential runtimes into trivial linear tasks.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                <Activity className="w-5 h-5" />
                Overlapping Subproblems
              </div>
              <p className="text-sm text-slate-600">The same smaller problems are evaluated multiple times during the recursive process.</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                <BrainCircuit className="w-5 h-5" />
                Optimal Substructure
              </div>
              <p className="text-sm text-slate-600">The globally optimal solution can be constructed directly from locally optimal sub-solutions.</p>
            </div>
          </div>

          <div className="pt-4">
            <button className="group relative inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-full font-semibold text-lg hover:bg-indigo-700 transition-all hover:shadow-lg hover:shadow-indigo-600/20 active:scale-95">
              Start Module 1: Fibonacci
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Demo */}
        <div className="flex-1 w-full max-w-lg lg:max-w-none">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
            
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Play className="w-4 h-4 text-indigo-400" />
                Live Concept: The Cost of Forgetting
              </h3>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/50" />
                <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
              </div>
            </div>

            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <label className="text-sm font-semibold text-slate-700 flex flex-col gap-1">
                  Problem Size (N)
                  <span className="text-xs text-slate-500 font-normal">Calculate Fibonacci(N)</span>
                </label>
                <span className="text-2xl font-bold text-indigo-600 font-mono">{n}</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="25" 
                value={n} 
                onChange={(e) => setN(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="p-6 grid grid-cols-2 gap-6 bg-white relative">
              {/* Divider line */}
              <div className="absolute top-6 bottom-6 left-1/2 w-px bg-slate-100 -translate-x-1/2" />

              {/* Naive Stats */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
                    Naive Recursion
                    {n > 20 && <AlertTriangle className="w-3 h-3" />}
                  </span>
                  <span className="text-sm text-slate-500">O(2ⁿ) Time Complexity</span>
                </div>
                
                <div className="bg-rose-50 rounded-xl p-4 border border-rose-100 flex flex-col gap-1">
                  <span className="text-xs text-rose-600 font-medium uppercase tracking-wider">Function Calls</span>
                  <span className="text-3xl font-mono font-bold text-rose-700 tabular-nums">
                    {animatedNaive.toLocaleString()}
                  </span>
                </div>

                {/* Visual representation of calls */}
                <div className="h-40 bg-slate-50 rounded-lg border border-slate-200 p-2 overflow-hidden relative">
                  <div className="flex flex-wrap gap-[2px] content-start h-full">
                    {Array.from({ length: Math.min(naiveCalls, 400) }).map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 bg-rose-400 rounded-sm opacity-60" />
                    ))}
                  </div>
                  {naiveCalls > 400 && (
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-50 to-transparent flex items-end justify-center pb-2">
                      <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded-md border border-rose-200 shadow-sm">
                        + {(naiveCalls - 400).toLocaleString()} more
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* DP Stats */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                    Dynamic Programming
                  </span>
                  <span className="text-sm text-slate-500">O(N) Time Complexity</span>
                </div>

                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex flex-col gap-1">
                  <span className="text-xs text-emerald-700 font-medium uppercase tracking-wider">Function Calls</span>
                  <span className="text-3xl font-mono font-bold text-emerald-700 tabular-nums">
                    {dpCalls.toLocaleString()}
                  </span>
                </div>

                {/* Visual representation of calls */}
                <div className="h-40 bg-slate-50 rounded-lg border border-slate-200 p-2 overflow-hidden relative">
                  <div className="flex flex-wrap gap-[2px] content-start h-full">
                    {Array.from({ length: dpCalls }).map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 bg-emerald-500 rounded-sm" />
                    ))}
                  </div>
                </div>
              </div>

            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-sm text-slate-600 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Notice the difference?
              </span>
              <span className="font-medium text-indigo-600">
                {naiveCalls > dpCalls ? `${(naiveCalls / dpCalls).toFixed(1)}x fewer operations` : 'Equal operations'}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Runtime deps: lucide-react@0.263.1