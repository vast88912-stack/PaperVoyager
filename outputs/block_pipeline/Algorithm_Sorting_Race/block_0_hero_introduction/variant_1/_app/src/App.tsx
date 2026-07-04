import React, { useState, useEffect } from 'react';
import { Play, Info, BarChart2, Zap, LayoutList, ShieldCheck } from 'lucide-react';

// Simulated sorting states for the hero visual
const SHUFFLED_STATE = [85, 30, 95, 45, 15, 75, 55, 25, 65, 10, 90, 40, 70, 20, 60, 50, 80, 35];
const SORTED_STATE =   [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95];

export default function App() {
  const [bars, setBars] = useState(SHUFFLED_STATE);
  const [isSorted, setIsSorted] = useState(false);

  // Auto-toggle the sorting visual in the hero section every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsSorted((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setBars(isSorted ? SORTED_STATE : SHUFFLED_STATE);
  }, [isSorted]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-200 selection:text-indigo-900 flex flex-col overflow-hidden relative">
      
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

      {/* Navigation / Header */}
      <header className="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shadow-lg shadow-indigo-200">
            <BarChart2 className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900">
            SortingRace<span className="text-indigo-600">2.0</span>
          </span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-semibold text-slate-600">
          <a href="#algorithms" className="hover:text-indigo-600 transition-colors">Algorithms</a>
          <a href="#datasets" className="hover:text-indigo-600 transition-colors">Datasets</a>
          <a href="#pedagogy" className="hover:text-indigo-600 transition-colors">How it Works</a>
        </nav>
        <button className="hidden md:flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
          <Play className="w-4 h-4" /> Enter Arena
        </button>
      </header>

      {/* Main Hero Content */}
      <main className="relative z-10 flex-grow container mx-auto px-6 flex flex-col lg:flex-row items-center justify-center gap-16 pb-20 pt-10">
        
        {/* Left Column: Copy & CTA */}
        <div className="w-full lg:w-1/2 flex flex-col items-start gap-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider border border-indigo-200">
            <Zap className="w-3.5 h-3.5" />
            <span>ChatGPT Edition</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
            The Ultimate <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-500">
              Algorithm Showdown
            </span>
          </h1>
          
          <p className="text-lg lg:text-xl text-slate-600 leading-relaxed max-w-xl font-medium">
            Watch Bubble, Merge, Quick, Heap, and Radix sort battle it out in real-time. 
            Discover how dataset shapes—from random to nearly sorted—impact performance, swaps, and stability.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 transform hover:-translate-y-1">
              <Play className="w-5 h-5 fill-current" />
              Start the Race
            </button>
            <button className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-sm hover:shadow-md">
              <Info className="w-5 h-5" />
              Explore the Math
            </button>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-200 w-full">
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                <LayoutList className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Multiple Datasets</h3>
              <p className="text-xs text-slate-500 font-medium">Test on random, reversed, or nearly sorted arrays.</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                <BarChart2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Live Telemetry</h3>
              <p className="text-xs text-slate-500 font-medium">Track array reads, writes, and swaps in real-time.</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Stability Analysis</h3>
              <p className="text-xs text-slate-500 font-medium">Visualize how algorithms handle duplicate values.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Visual */}
        <div className="w-full lg:w-1/2 relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100 to-emerald-50 transform rotate-3 rounded-[3rem] shadow-inner"></div>
          <div className="relative bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 transform -rotate-2 hover:rotate-0 transition-transform duration-500 ease-out">
            
            {/* Visual Header */}
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                </div>
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-2">Live Preview</span>
              </div>
              <div className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${isSorted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {isSorted ? 'O(n log n) Achieved' : 'Sorting in Progress...'}
              </div>
            </div>

            {/* The Bar Chart Visual */}
            <div className="h-64 flex items-end justify-between gap-1 sm:gap-2">
              {bars.map((height, index) => {
                // Determine color based on height to create a gradient effect when sorted
                const hue = 220 + (height / 100) * 100; // From blue to purple/pink
                
                return (
                  <div
                    key={index}
                    className="w-full rounded-t-sm sm:rounded-t-md relative group"
                    style={{
                      height: `${height}%`,
                      backgroundColor: `hsl(${hue}, 80%, 60%)`,
                      transition: 'height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.8s ease'
                    }}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {height}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mock Controls */}
            <div className="mt-8 flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase">Algorithm</span>
                <span className="text-sm font-black text-slate-700">Quick Sort</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-slate-400 uppercase">Elements</span>
                <span className="text-sm font-black text-slate-700">{bars.length}</span>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}

// Optional dependencies (Tailwind is assumed to be configured in the environment)
// npm install lucide-react