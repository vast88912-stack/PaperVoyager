import React, { useState, useEffect } from 'react';

const CANDY_COLORS = [
  '#F472B6', // pink-400
  '#22D3EE', // cyan-400
  '#FACC15', // yellow-400
  '#C084FC', // purple-400
  '#FB923C', // orange-400
  '#4ADE80', // green-400
  '#FB7185', // rose-400
  '#60A5FA', // blue-400
  '#2DD4BF', // teal-400
  '#818CF8', // indigo-400
];

export default function App() {
  const [k, setK] = useState<number>(4);
  const [isDragging, setIsDragging] = useState(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setK(parseInt(e.target.value, 10));
  };

  // Generate some random positions for a decorative background
  const [bgDots, setBgDots] = useState<{x: number, y: number, r: number, c: string}[]>([]);
  useEffect(() => {
    const dots = Array.from({ length: 30 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      r: Math.random() * 4 + 2,
      c: CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)]
    }));
    setBgDots(dots);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Decorative Background Dots */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        {bgDots.map((dot, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              width: `${dot.r}px`,
              height: `${dot.r}px`,
              backgroundColor: dot.c,
            }}
          />
        ))}
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 text-indigo-500 mb-4 shadow-inner">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            Select Clusters
          </h2>
          <p className="text-slate-500 mt-2 text-sm font-medium">
            Adjust the slider to set the number of centroids (K).
          </p>
        </div>

        {/* Visualization Area */}
        <div className="flex flex-wrap justify-center items-center gap-3 mb-10 min-h-[140px] p-6 bg-slate-100/50 rounded-2xl border border-slate-200/60 shadow-inner relative overflow-hidden">
          {Array.from({ length: k }).map((_, i) => (
            <div
              key={`blob-${i}-${k}`} // Force re-render for animation on K change
              className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white font-bold text-lg border-2 border-white/50"
              style={{
                backgroundColor: CANDY_COLORS[i % CANDY_COLORS.length],
                animation: `popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${i * 0.04}s both`
              }}
            >
              {i + 1}
            </div>
          ))}
          
          {k === 0 && (
            <span className="text-slate-400 font-medium animate-pulse">
              No clusters selected
            </span>
          )}
        </div>

        {/* Slider Area */}
        <div className="relative pt-2 pb-4">
          <div className="flex justify-between items-end mb-4">
            <span className="text-sm font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">K = 1</span>
            <div className="flex flex-col items-center">
              <span className={`text-5xl font-black transition-colors duration-300 ${isDragging ? 'text-indigo-500' : 'text-slate-700'}`}>
                {k}
              </span>
            </div>
            <span className="text-sm font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">K = 10</span>
          </div>
          
          <div className="relative">
            <input
              type="range"
              min="1"
              max="10"
              value={k}
              onChange={handleSliderChange}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              className="w-full h-4 bg-slate-200 rounded-full appearance-none cursor-pointer outline-none shadow-inner"
              style={{
                background: `linear-gradient(to right, #6366f1 0%, #818cf8 ${(k - 1) * 11.11}%, #e2e8f0 ${(k - 1) * 11.11}%, #e2e8f0 100%)`
              }}
            />
            
            {/* Tick marks */}
            <div className="flex justify-between absolute top-6 left-0 right-0 px-2 pointer-events-none">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                <div key={val} className="flex flex-col items-center">
                  <div className={`w-1 h-1 rounded-full mb-1 ${val <= k ? 'bg-indigo-300' : 'bg-slate-300'}`} />
                  <span className={`text-[10px] font-bold ${val === k ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Extra info */}
        <div className="mt-12 pt-6 border-t border-slate-100 text-center">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm border border-indigo-100 transition-transform hover:scale-105 cursor-default">
            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Ready to initialize {k} {k === 1 ? 'centroid' : 'centroids'}</span>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.3) translateY(20px) rotate(-10deg); }
          50% { transform: scale(1.1) translateY(-5px) rotate(5deg); }
          100% { opacity: 1; transform: scale(1) translateY(0) rotate(0deg); }
        }
        
        /* Custom Slider Thumb Styles */
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ffffff;
          border: 4px solid #6366f1;
          cursor: grab;
          box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        input[type=range]:active::-webkit-slider-thumb {
          cursor: grabbing;
          transform: scale(1.2);
          border-color: #4f46e5;
          box-shadow: 0 6px 14px rgba(99, 102, 241, 0.4);
        }
        
        input[type=range]::-moz-range-thumb {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ffffff;
          border: 4px solid #6366f1;
          cursor: grab;
          box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        input[type=range]:active::-moz-range-thumb {
          cursor: grabbing;
          transform: scale(1.2);
          border-color: #4f46e5;
          box-shadow: 0 6px 14px rgba(99, 102, 241, 0.4);
        }
      `}} />
    </div>
  );
}