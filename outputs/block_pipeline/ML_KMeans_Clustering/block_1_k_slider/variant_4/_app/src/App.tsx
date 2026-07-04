import React, { useState, useEffect } from 'react';

const CANDY_COLORS = [
  '#FF006E', // Vibrant Pink
  '#3A86FF', // Bright Blue
  '#8338EC', // Purple
  '#FFBE0B', // Yellow
  '#FB5607', // Orange
  '#00F5D4', // Mint/Cyan
  '#FF595E', // Red-Pink
  '#8AC926', // Lime Green
  '#1982C4', // Ocean Blue
  '#6A4C93', // Deep Purple
  '#F15BB5', // Magenta
  '#9B5DE5', // Lavender
  '#00BBF9', // Light Blue
  '#FEE440', // Lemon
  '#00B4D8'  // Aqua
];

export default function App() {
  const [kValue, setKValue] = useState<number>(3);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dots, setDots] = useState<number[]>([]);

  useEffect(() => {
    // Animate the array update slightly for a better visual feel
    const newDots = Array.from({ length: kValue }, (_, i) => i);
    setDots(newDots);
  }, [kValue]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans selection:bg-pink-200 text-slate-800">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-pink-300 to-purple-300 blur-3xl mix-blend-multiply" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-tl from-cyan-300 to-blue-300 blur-3xl mix-blend-multiply" />
      </div>

      <div className="relative z-10 w-full max-w-lg bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] p-8">
        
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">
              Clusters <span className="text-pink-500">(K)</span>
            </h2>
            <p className="text-sm font-medium text-slate-400 mt-1">
              Adjust the number of centroids
            </p>
          </div>
          
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500" />
            <div className="relative flex items-center justify-center bg-white border border-slate-100 w-16 h-16 rounded-2xl shadow-sm">
              <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-br from-slate-700 to-slate-900">
                {kValue}
              </span>
            </div>
          </div>
        </div>

        {/* Visualizer Section */}
        <div className="h-28 flex items-center justify-center mb-8 bg-slate-50/50 rounded-2xl border border-slate-100/50 p-4 overflow-hidden relative">
          {kValue === 0 ? (
            <span className="text-slate-300 font-medium">No clusters selected</span>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {dots.map((index) => (
                <div
                  key={index}
                  className="w-10 h-10 rounded-full shadow-md flex items-center justify-center transform transition-all duration-300 ease-out hover:scale-125 hover:-translate-y-1 cursor-crosshair"
                  style={{
                    backgroundColor: CANDY_COLORS[index % CANDY_COLORS.length],
                    animation: `popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${index * 0.05}s both`
                  }}
                >
                  <div className="w-3 h-3 bg-white/40 rounded-full mix-blend-overlay transform -translate-x-1 -translate-y-1" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slider Control Section */}
        <div className="relative flex flex-col gap-4">
          <div className="flex justify-between px-1 text-xs font-bold text-slate-400">
            <span>1</span>
            <span>15</span>
          </div>
          
          <div className="relative flex items-center w-full">
            {/* Custom Track Background */}
            <div className="absolute left-0 right-0 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 transition-all duration-75 ease-linear"
                style={{ width: `${((kValue - 1) / 14) * 100}%` }}
              />
            </div>

            {/* Native Input Range (Overlayed and invisible except for the thumb) */}
            <input
              type="range"
              min="1"
              max="15"
              value={kValue}
              onChange={(e) => setKValue(parseInt(e.target.value))}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              className="absolute w-full h-3 opacity-0 cursor-pointer z-20"
            />

            {/* Custom Thumb Element */}
            <div 
              className={`absolute w-8 h-8 bg-white border-2 border-slate-200 rounded-full shadow-lg flex items-center justify-center pointer-events-none transition-transform duration-150 z-10 ${isDragging ? 'scale-110 shadow-xl border-pink-400' : 'hover:scale-105 hover:border-slate-300'}`}
              style={{
                left: `calc(${((kValue - 1) / 14) * 100}% - 16px)`
              }}
            >
              <div className="w-2 h-2 rounded-full bg-slate-300" />
            </div>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.3) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}} />
    </div>
  );
}