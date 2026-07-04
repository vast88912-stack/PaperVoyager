import React, { useState, useRef, useEffect, useMemo } from 'react';

// Candy color palette for clusters
const CANDY_COLORS = [
  '#FF9AA2', // Pink
  '#FFB7B2', // Peach
  '#FFDAC1', // Light Orange
  '#FFF2CE', // Pale Yellow
  '#E2F0CB', // Mint
  '#B5EAD7', // Cyan
  '#C7CEEA', // Lavender
  '#E8DFF5', // Lilac
  '#FCE2E5', // Soft Pink
  '#D4A5A5', // Dusty Rose
];

export default function App() {
  const [kValue, setKValue] = useState<number>(4);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Mock metrics based on K for data viz context
  const mockInertia = useMemo(() => Math.max(100, 10000 / Math.pow(kValue, 1.2)).toFixed(0), [kValue]);
  const mockSilhouette = useMemo(() => {
    // Fake silhouette score that peaks around K=4
    const base = 0.85;
    const penalty = Math.abs(4 - kValue) * 0.12;
    return Math.max(0.1, base - penalty).toFixed(2);
  }, [kValue]);

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-6 font-sans text-slate-800 selection:bg-pink-200">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 p-8 flex flex-col gap-8 relative overflow-hidden">
        
        {/* Background decorative blobs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-[#FF9AA2] to-[#FFDAC1] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-[#B5EAD7] to-[#C7CEEA] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000" />

        <div className="relative z-10 flex flex-col gap-2 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500">
            Cluster Count
          </h2>
          <p className="text-sm text-slate-400 font-medium tracking-wide uppercase">
            Adjust K-Means Centroids
          </p>
        </div>

        {/* Centroid Visualizer Preview */}
        <div className="relative z-10 h-40 w-full bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden shadow-inner">
          <div className="relative w-full h-full flex items-center justify-center">
            {Array.from({ length: 10 }).map((_, i) => {
              const isActive = i < kValue;
              // Circular arrangement mathematics
              const angle = (i / kValue) * 2 * Math.PI - Math.PI / 2;
              const radius = 45;
              const x = isActive ? Math.cos(angle) * radius : 0;
              const y = isActive ? Math.sin(angle) * radius : 0;

              return (
                <div
                  key={i}
                  className="absolute w-8 h-8 rounded-full shadow-lg transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)"
                  style={{
                    backgroundColor: CANDY_COLORS[i],
                    transform: `translate(${x}px, ${y}px) scale(${isActive ? 1 : 0})`,
                    opacity: isActive ? 1 : 0,
                    boxShadow: isActive ? `0 4px 12px ${CANDY_COLORS[i]}66` : 'none',
                    zIndex: isActive ? 10 : 0,
                  }}
                >
                  {isActive && (
                    <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: CANDY_COLORS[i] }} />
                  )}
                </div>
              );
            })}
            
            {/* Center anchor dot */}
            <div className="absolute w-2 h-2 bg-slate-200 rounded-full" />
          </div>
        </div>

        {/* The K Slider Module */}
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-end justify-between px-2">
            <span className="text-5xl font-black tabular-nums tracking-tighter text-slate-800">
              {kValue}
            </span>
            <span className="text-sm font-semibold text-slate-400 mb-1">
              Max 10
            </span>
          </div>

          <div className="relative w-full h-12 flex items-center cursor-pointer group">
            {/* Custom Slider Track */}
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={kValue}
              onChange={(e) => setKValue(parseInt(e.target.value))}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              className="absolute w-full h-full opacity-0 cursor-pointer z-20"
              aria-label="Number of clusters (K)"
            />
            
            {/* Visual Track Background */}
            <div className="absolute w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              {/* Active Track Fill */}
              <div 
                className="h-full bg-gradient-to-r from-[#FF9AA2] via-[#E2F0CB] to-[#C7CEEA] transition-all duration-150 ease-out"
                style={{ width: `${((kValue - 1) / 9) * 100}%` }}
              />
            </div>

            {/* Custom Thumb */}
            <div 
              className={`absolute h-8 w-8 bg-white border-[3px] rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.1)] flex items-center justify-center transition-transform duration-150 pointer-events-none z-10 ${isDragging ? 'scale-125' : 'group-hover:scale-110'}`}
              style={{ 
                left: `calc(${((kValue - 1) / 9) * 100}% - 16px)`,
                borderColor: CANDY_COLORS[kValue - 1] || '#FF9AA2'
              }}
            >
              <div 
                className="w-2.5 h-2.5 rounded-full transition-colors duration-300"
                style={{ backgroundColor: CANDY_COLORS[kValue - 1] || '#FF9AA2' }}
              />
            </div>
            
            {/* Tick Marks */}
            <div className="absolute w-full flex justify-between px-[14px] pointer-events-none z-0">
              {Array.from({ length: 10 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1 h-1 rounded-full transition-colors duration-300 ${i + 1 <= kValue ? 'bg-white/70' : 'bg-slate-300'}`} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Live Metrics Badges */}
        <div className="relative z-10 flex gap-4 mt-2">
          <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-1 transition-all">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Inertia</span>
            <span className="text-lg font-bold text-slate-700 tabular-nums">{mockInertia}</span>
          </div>
          <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-1 transition-all">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Silhouette</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-700 tabular-nums">{mockSilhouette}</span>
              {kValue === 4 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B5EAD7] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B5EAD7]"></span>
                </span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}