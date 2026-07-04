import React, { useState, useEffect } from 'react';

export default function App() {
  const [fastArray, setFastArray] = useState([10, 40, 25, 60, 90, 30, 75, 50, 85, 20]);
  const [slowArray, setSlowArray] = useState([90, 85, 75, 60, 50, 40, 30, 25, 20, 10]);
  const [hoveredAlg, setHoveredAlg] = useState<string | null>(null);

  // Simulate "Fast" sorting algorithm (e.g., Quick Sort) visual churn
  useEffect(() => {
    const fastInterval = setInterval(() => {
      setFastArray((prev) => {
        const arr = [...prev];
        const i = Math.floor(Math.random() * arr.length);
        const j = Math.floor(Math.random() * arr.length);
        [arr[i], arr[j]] = [arr[j], arr[i]];
        return arr;
      });
    }, 250);
    return () => clearInterval(fastInterval);
  }, []);

  // Simulate "Slow" sorting algorithm (e.g., Bubble Sort) visual churn
  useEffect(() => {
    const slowInterval = setInterval(() => {
      setSlowArray((prev) => {
        const arr = [...prev];
        const i = Math.floor(Math.random() * (arr.length - 1));
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
        return arr;
      });
    }, 800);
    return () => clearInterval(slowInterval);
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-black font-sans overflow-hidden relative selection:bg-[#FF3366] selection:text-white flex flex-col">
      {/* Decorative Background Grid */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between p-6 md:px-12 border-b-4 border-black bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FF3366] border-2 border-black rounded-full flex items-center justify-center animate-pulse">
            <div className="w-3 h-3 bg-white rounded-full" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight">SortingRace<span className="text-[#00E5FF]">2.0</span></h1>
        </div>
        <div className="hidden md:flex gap-6 font-bold uppercase tracking-wider text-sm">
          <a href="#algorithms" className="hover:text-[#FF3366] transition-colors">Algorithms</a>
          <a href="#datasets" className="hover:text-[#FF3366] transition-colors">Datasets</a>
          <a href="#pedagogy" className="hover:text-[#FF3366] transition-colors">Pedagogy</a>
        </div>
        <button className="border-2 border-black bg-[#00E5FF] px-4 py-2 font-bold uppercase text-sm hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all">
          GitHub
        </button>
      </nav>

      {/* Main Hero Content */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center p-6 md:p-12 gap-12 max-w-7xl mx-auto w-full">
        
        {/* Left Column: Typography & CTA */}
        <div className="flex-1 flex flex-col items-start gap-8">
          <div className="inline-block border-2 border-black bg-[#FFE600] px-3 py-1 font-bold text-sm uppercase transform -rotate-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            ChatGPT Edition
          </div>
          
          <h2 className="text-6xl md:text-8xl font-black uppercase leading-[0.9] tracking-tighter">
            The Ultimate <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF3366] to-[#7B1FA2] drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              Algorithm
            </span><br/>
            Showdown.
          </h2>
          
          <p className="text-xl md:text-2xl font-medium max-w-lg leading-relaxed border-l-4 border-black pl-6">
            Watch Bubble, Merge, Quick, and Heap sort battle it out in real-time. Explore dataset impacts, stability, and time complexity visually.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto">
            <button className="border-4 border-black bg-[#FF3366] text-white px-8 py-4 font-black text-xl uppercase tracking-wider hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all flex items-center justify-center gap-3">
              Start the Race
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>
            <button className="border-4 border-black bg-white text-black px-8 py-4 font-black text-xl uppercase tracking-wider hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all flex items-center justify-center gap-3">
              Explore Theory
            </button>
          </div>
        </div>

        {/* Right Column: Visual Race Track Simulation */}
        <div className="flex-1 w-full max-w-lg relative perspective-1000">
          
          {/* Decorative Elements */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#00E5FF] rounded-full border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -z-10 animate-bounce" style={{ animationDuration: '3s' }} />
          <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-[#FFE600] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -z-10 transform rotate-12" />

          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col">
            {/* Header */}
            <div className="border-b-4 border-black p-4 bg-[#F4F4F4] flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest text-lg">Live Preview</h3>
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-black rounded-full" />
                <div className="w-3 h-3 bg-black rounded-full" />
                <div className="w-3 h-3 bg-black rounded-full" />
              </div>
            </div>

            {/* Track 1: Fast Sort */}
            <div 
              className="p-6 border-b-4 border-black relative overflow-hidden group transition-colors"
              onMouseEnter={() => setHoveredAlg('quick')}
              onMouseLeave={() => setHoveredAlg(null)}
              style={{ backgroundColor: hoveredAlg === 'quick' ? '#E0F7FA' : 'transparent' }}
            >
              <div className="flex justify-between items-end mb-4">
                <div className="font-bold uppercase text-sm bg-black text-white px-2 py-1">Lane 1: Quick Sort</div>
                <div className="font-mono text-xs font-bold text-[#FF3366]">O(n log n)</div>
              </div>
              <div className="flex items-end justify-between h-32 gap-1">
                {fastArray.map((val, idx) => (
                  <div 
                    key={idx} 
                    className="w-full bg-[#00E5FF] border-2 border-black transition-all duration-150 ease-in-out"
                    style={{ height: `${val}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Track 2: Slow Sort */}
            <div 
              className="p-6 relative overflow-hidden group transition-colors"
              onMouseEnter={() => setHoveredAlg('bubble')}
              onMouseLeave={() => setHoveredAlg(null)}
              style={{ backgroundColor: hoveredAlg === 'bubble' ? '#FCE4EC' : 'transparent' }}
            >
              <div className="flex justify-between items-end mb-4">
                <div className="font-bold uppercase text-sm bg-black text-white px-2 py-1">Lane 2: Bubble Sort</div>
                <div className="font-mono text-xs font-bold text-[#FF3366]">O(n²)</div>
              </div>
              <div className="flex items-end justify-between h-32 gap-1">
                {slowArray.map((val, idx) => (
                  <div 
                    key={idx} 
                    className="w-full bg-[#FF3366] border-2 border-black transition-all duration-300 ease-in-out"
                    style={{ height: `${val}%` }}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Floating Info Card */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 items-center gap-6 z-20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#00E5FF] border-2 border-black flex items-center justify-center">
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <div>
            <h4 className="font-black uppercase text-sm">Real-time Rendering</h4>
            <p className="text-xs font-medium text-gray-600">Powered by requestAnimationFrame</p>
          </div>
        </div>
        <div className="w-0.5 h-10 bg-black" />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#FFE600] border-2 border-black flex items-center justify-center">
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <div>
            <h4 className="font-black uppercase text-sm">Stability Matters</h4>
            <p className="text-xs font-medium text-gray-600">Toggle visual stability markers</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dependencies needed for this component:
// - Tailwind CSS (configured for the project)
// - React (useState, useEffect)