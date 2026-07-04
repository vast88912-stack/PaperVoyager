import React, { useState, useEffect } from 'react';

export default function App() {
  const [bars, setBars] = useState<number[]>([]);
  const [isHovering, setIsHovering] = useState(false);

  // Initialize and animate hero background bars
  useEffect(() => {
    const generateRandomBars = () => {
      return Array.from({ length: 16 }, () => Math.floor(Math.random() * 80) + 10);
    };

    const sortedBars = [...generateRandomBars()].sort((a, b) => a - b);
    setBars(generateRandomBars());

    let interval: NodeJS.Timeout;
    if (!isHovering) {
      interval = setInterval(() => {
        setBars((prev) => {
          // If already sorted, scramble. If scrambled, sort.
          const isSorted = prev.every((val, i, arr) => !i || val >= arr[i - 1]);
          if (isSorted) {
            return generateRandomBars();
          } else {
            return [...prev].sort((a, b) => a - b);
          }
        });
      }, 2500);
    } else {
      // Interactive hover effect: quick scramble
      interval = setInterval(() => {
        setBars(generateRandomBars());
      }, 400);
    }

    return () => clearInterval(interval);
  }, [isHovering]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden flex flex-col justify-center relative">
      {/* Abstract Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-100 rounded-full blur-3xl opacity-50"></div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Column: Typography & CTAs */}
        <div className="flex flex-col items-start space-y-8">
          <div className="inline-flex items-center space-x-2 bg-amber-100 border border-amber-300 text-amber-900 px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase shadow-sm">
            <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            <span>ChatGPT Edition</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
              The Ultimate <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500">
                Sorting Race
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-xl leading-relaxed font-medium">
              Watch Bubble, Merge, Quick, and Radix sort battle it out in real-time. 
              Explore the pedagogy of algorithms with live visual tracks, performance metrics, and stability insights.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] transition-all hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-1 flex items-center justify-center gap-2">
              Start Racing
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
            <button className="px-8 py-4 bg-white border-2 border-slate-200 hover:border-slate-900 hover:bg-slate-50 text-slate-900 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2">
              Explore Algorithms
            </button>
          </div>

          {/* Quick Stats / Highlights */}
          <div className="pt-6 border-t border-slate-200 w-full grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-black text-slate-900">6+</div>
              <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Algorithms</div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">4</div>
              <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Data Presets</div>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-600">60fps</div>
              <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Live Render</div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Visual Hero */}
        <div 
          className="relative w-full aspect-square md:aspect-auto md:h-[600px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col p-8 group cursor-crosshair overflow-hidden"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Header of the visual box */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-rose-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
            </div>
            <div className="text-xs font-mono font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-md">
              {isHovering ? 'status: scrambling...' : 'status: auto-sorting'}
            </div>
          </div>

          {/* The Bars */}
          <div className="flex-1 flex items-end justify-between gap-1 sm:gap-2">
            {bars.map((height, index) => {
              // Create a gradient based on the height for visual flair
              const hue = Math.floor((height / 100) * 120 + 200); // from blue to purpleish
              return (
                <div
                  key={index}
                  className="w-full rounded-t-sm sm:rounded-t-md transition-all duration-500 ease-in-out relative group-hover:opacity-80"
                  style={{
                    height: `${height}%`,
                    backgroundColor: `hsl(${hue}, 80%, 60%)`,
                    boxShadow: `0 0 20px hsla(${hue}, 80%, 60%, 0.3)`
                  }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                    {height}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating badge for interaction */}
          <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-medium shadow-xl transition-all duration-300 ${isHovering ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            Hover to disrupt the array
          </div>
        </div>

      </main>
    </div>
  );
}