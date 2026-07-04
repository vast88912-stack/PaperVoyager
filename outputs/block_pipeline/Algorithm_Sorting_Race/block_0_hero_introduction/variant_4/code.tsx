import React, { useState, useEffect } from 'react';

export default function App() {
  const [bars, setBars] = useState([85, 35, 100, 55, 20, 75, 45, 90]);
  const [isHovered, setIsHovered] = useState(false);

  // Simulated background sorting animation
  useEffect(() => {
    if (isHovered) return; // Pause on hover for interactive effect
    const interval = setInterval(() => {
      setBars((prev) => {
        const newBars = [...prev];
        const idx1 = Math.floor(Math.random() * newBars.length);
        const idx2 = Math.floor(Math.random() * newBars.length);
        // Swap to create dynamic movement
        const temp = newBars[idx1];
        newBars[idx1] = newBars[idx2];
        newBars[idx2] = temp;
        return newBars;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [isHovered]);

  const handleBarHover = (index: number) => {
    setBars((prev) => {
      const newBars = [...prev];
      newBars[index] = Math.min(100, newBars[index] + 10);
      return newBars;
    });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-hidden flex flex-col">
      {/* Navigation / Header */}
      <header className="w-full border-b-4 border-black bg-white p-4 lg:px-8 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black flex items-center justify-center rotate-3">
            <span className="text-white font-black text-xl leading-none">S</span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">
            Sorting Race <span className="text-blue-600">2.0</span>
          </h1>
        </div>
        <nav className="hidden md:flex gap-6 font-bold uppercase text-sm tracking-wide">
          <a href="#algorithms" className="hover:text-blue-600 transition-colors">Algorithms</a>
          <a href="#datasets" className="hover:text-blue-600 transition-colors">Datasets</a>
          <a href="#pedagogy" className="hover:text-blue-600 transition-colors">Learn</a>
        </nav>
        <button className="border-2 border-black px-4 py-2 font-bold uppercase text-sm bg-yellow-400 hover:bg-yellow-300 shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-[0px_0px_0_0_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 transition-all">
          GitHub
        </button>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col lg:flex-row relative">
        
        {/* Background Decorative Elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-pulse"></div>
        <div className="absolute bottom-10 right-20 w-48 h-48 bg-cyan-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-pink-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-pulse" style={{ animationDelay: '2s' }}></div>

        {/* Left Content Column */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-12 lg:p-20 z-10">
          <div className="inline-flex items-center gap-3 mb-6">
            <span className="bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-sm">
              New Release
            </span>
            <span className="font-bold text-sm text-slate-600 uppercase tracking-wide border-b-2 border-slate-300">
              ChatGPT Edition
            </span>
          </div>
          
          <h2 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight mb-6 text-black">
            The Ultimate <br />
            <span className="relative inline-block">
              <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-cyan-500">
                Algorithmic
              </span>
              <div className="absolute bottom-1 left-0 w-full h-3 bg-yellow-300 -z-0 -rotate-1"></div>
            </span> <br />
            Showdown.
          </h2>
          
          <p className="text-lg lg:text-xl font-medium text-slate-700 mb-8 max-w-lg leading-relaxed border-l-4 border-black pl-4">
            Watch Bubble, Merge, Quick, Heap, and Radix sorts go head-to-head in real-time. Uncover the pedagogy behind the performance with live dataset swapping and split-lane race tracks.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button className="border-4 border-black bg-blue-600 text-white px-8 py-4 font-black uppercase text-lg hover:bg-blue-500 shadow-[8px_8px_0_0_rgba(0,0,0,1)] active:shadow-[0px_0px_0_0_rgba(0,0,0,1)] active:translate-x-2 active:translate-y-2 transition-all flex items-center gap-2">
              Start The Race
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
            <button className="border-4 border-black bg-white text-black px-8 py-4 font-black uppercase text-lg hover:bg-gray-100 shadow-[8px_8px_0_0_rgba(0,0,0,1)] active:shadow-[0px_0px_0_0_rgba(0,0,0,1)] active:translate-x-2 active:translate-y-2 transition-all">
              Configure Data
            </button>
          </div>

          <div className="mt-12 flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-3xl font-black">6</span>
              <span className="text-xs font-bold uppercase text-slate-500">Algorithms</span>
            </div>
            <div className="w-px h-10 bg-black"></div>
            <div className="flex flex-col">
              <span className="text-3xl font-black">4</span>
              <span className="text-xs font-bold uppercase text-slate-500">Datasets</span>
            </div>
            <div className="w-px h-10 bg-black"></div>
            <div className="flex flex-col">
              <span className="text-3xl font-black">∞</span>
              <span className="text-xs font-bold uppercase text-slate-500">Insights</span>
            </div>
          </div>
        </div>

        {/* Right Visual Column */}
        <div className="w-full lg:w-1/2 relative bg-slate-900 flex items-center justify-center p-6 lg:p-20 border-t-4 lg:border-t-0 lg:border-l-4 border-black">
          {/* High Contrast Background Grid Pattern */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          
          <div 
            className="w-full max-w-md bg-white border-4 border-black p-6 shadow-[12px_12px_0_0_#FFE800] relative z-10"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="flex items-center justify-between border-b-4 border-black pb-4 mb-6">
              <h3 className="font-black uppercase text-xl">Live Preview</h3>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-pink-500 border-2 border-black"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400 border-2 border-black"></div>
                <div className="w-3 h-3 rounded-full bg-cyan-400 border-2 border-black"></div>
              </div>
            </div>

            {/* Simulated Sorting Track */}
            <div className="h-64 flex items-end justify-between gap-2 lg:gap-3">
              {bars.map((height, idx) => (
                <div 
                  key={idx} 
                  className="w-full bg-cyan-400 border-2 border-black cursor-pointer hover:bg-pink-400 relative group transition-all duration-300 ease-out"
                  style={{ height: `${height}%` }}
                  onMouseEnter={() => handleBarHover(idx)}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs font-bold px-2 py-1 pointer-events-none">
                    {height}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t-4 border-black pt-4 flex justify-between items-center">
              <div className="font-bold text-sm uppercase">Quick Sort</div>
              <div className="font-bold text-sm bg-yellow-400 border-2 border-black px-2 py-1">
                {isHovered ? 'Interactive' : 'Simulating...'}
              </div>
            </div>
          </div>
          
          {/* Floating Accents */}
          <div className="absolute top-1/4 right-10 bg-pink-400 border-4 border-black px-4 py-2 font-black uppercase text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] rotate-12 z-20">
            O(N log N)
          </div>
          <div className="absolute bottom-1/4 left-10 bg-yellow-400 border-4 border-black px-4 py-2 font-black uppercase text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] -rotate-6 z-20">
            Stable
          </div>
        </div>
      </main>
    </div>
  );
}