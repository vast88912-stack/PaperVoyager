import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Info, Sparkles } from 'lucide-react';

// Runtime dependencies: lucide-react

const CANDY_COLORS = [
  { bg: 'bg-[#FF6B6B]', shadow: 'shadow-[#FF6B6B]/40', border: 'border-[#FF6B6B]' }, // Rose/Red
  { bg: 'bg-[#4ECDC4]', shadow: 'shadow-[#4ECDC4]/40', border: 'border-[#4ECDC4]' }, // Cyan/Mint
  { bg: 'bg-[#FFE66D]', shadow: 'shadow-[#FFE66D]/40', border: 'border-[#FFE66D]' }, // Yellow
  { bg: 'bg-[#9B5DE5]', shadow: 'shadow-[#9B5DE5]/40', border: 'border-[#9B5DE5]' }, // Purple
  { bg: 'bg-[#F15BB5]', shadow: 'shadow-[#F15BB5]/40', border: 'border-[#F15BB5]' }, // Pink
  { bg: 'bg-[#00BBF9]', shadow: 'shadow-[#00BBF9]/40', border: 'border-[#00BBF9]' }, // Blue
  { bg: 'bg-[#00F5D4]', shadow: 'shadow-[#00F5D4]/40', border: 'border-[#00F5D4]' }, // Teal
  { bg: 'bg-[#FF9F1C]', shadow: 'shadow-[#FF9F1C]/40', border: 'border-[#FF9F1C]' }, // Orange
  { bg: 'bg-[#C7F464]', shadow: 'shadow-[#C7F464]/40', border: 'border-[#C7F464]' }, // Lime
  { bg: 'bg-[#D4A5A5]', shadow: 'shadow-[#D4A5A5]/40', border: 'border-[#D4A5A5]' }, // Dusty Rose
];

export default function App() {
  const [kValue, setKValue] = useState<number>(4);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Calculate the percentage for the slider track fill
  const fillPercentage = ((kValue - 1) / 9) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-slate-800">
      {/* Main Card Container */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 w-full max-w-md relative overflow-hidden">
        
        {/* Decorative background blob */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-cyan-100 to-emerald-100 rounded-full blur-3xl opacity-60 pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
              <SlidersHorizontal className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 leading-tight">Cluster Count</h2>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-0.5">Hyperparameter (k)</p>
            </div>
          </div>
          
          {/* Large K Display */}
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black tracking-tighter text-slate-800">
              {kValue}
            </span>
            <span className="text-lg font-bold text-slate-300">/10</span>
          </div>
        </div>

        {/* Visualizer: Candy Colored Blobs */}
        <div className="bg-slate-50/50 rounded-2xl p-6 mb-8 border border-slate-100/50 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Active Centroids
            </span>
          </div>
          
          <div className="flex flex-wrap gap-3 justify-center min-h-[48px] items-center">
            {Array.from({ length: 10 }).map((_, i) => {
              const isActive = i < kValue;
              const color = CANDY_COLORS[i];
              
              return (
                <div
                  key={i}
                  className={`
                    transition-all duration-500 ease-out rounded-full
                    ${isActive 
                      ? `w-10 h-10 opacity-100 shadow-lg scale-100 ${color.bg} ${color.shadow}` 
                      : 'w-4 h-4 opacity-20 scale-75 bg-slate-300 shadow-none'
                    }
                    ${isHovering && isActive ? 'animate-pulse' : ''}
                    ${isDragging && isActive ? 'scale-110' : ''}
                  `}
                />
              );
            })}
          </div>
        </div>

        {/* Slider Control */}
        <div 
          className="relative z-10"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div className="flex justify-between text-xs font-bold text-slate-400 mb-3 px-1">
            <span>1</span>
            <span>10</span>
          </div>
          
          <div className="relative w-full h-6 flex items-center">
            {/* Custom Track Background */}
            <div className="absolute w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              {/* Custom Track Fill */}
              <div 
                className="h-full bg-gradient-to-r from-[#4ECDC4] via-[#9B5DE5] to-[#FF6B6B] transition-all duration-150 ease-out"
                style={{ width: `${fillPercentage}%` }}
              />
            </div>

            {/* Actual Range Input (Invisible but interactive) */}
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={kValue}
              onChange={(e) => setKValue(parseInt(e.target.value))}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              className="absolute w-full h-full opacity-0 cursor-pointer z-20"
            />

            {/* Custom Thumb */}
            <div 
              className={`
                absolute h-7 w-7 bg-white rounded-full shadow-[0_2px_10px_rgb(0,0,0,0.15)] 
                border-2 transition-transform duration-150 ease-out flex items-center justify-center pointer-events-none z-10
                ${isDragging ? 'scale-125' : 'scale-100'}
                ${CANDY_COLORS[kValue - 1].border}
              `}
              style={{ 
                left: `calc(${fillPercentage}% - 14px)`,
              }}
            >
              <div className={`w-2 h-2 rounded-full ${CANDY_COLORS[kValue - 1].bg}`} />
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex items-start gap-3 relative z-10">
          <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-500 leading-relaxed">
            Adjusting <strong className="text-slate-700 font-semibold">k</strong> determines how many distinct clusters the algorithm will attempt to find in the dataset.
          </p>
        </div>
      </div>
    </div>
  );
}