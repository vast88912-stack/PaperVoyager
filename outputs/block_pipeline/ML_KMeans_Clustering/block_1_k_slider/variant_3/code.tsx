import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SlidersHorizontal, Activity, Target, Sparkles } from 'lucide-react';

const CANDY_COLORS = [
  '#FF9AA2', // 1: Salmon pink
  '#FFB7B2', // 2: Light pink
  '#FFDAC1', // 3: Peach
  '#F6EAC2', // 4: Pale yellow
  '#E2F0CB', // 5: Light green
  '#B5EAD7', // 6: Mint
  '#AEE5FF', // 7: Baby blue
  '#C7CEEA', // 8: Periwinkle
  '#F1CBFF', // 9: Lilac
  '#FFDFD3'  // 10: Pale orange
];

// Mock metrics mapping for realistic-feeling dashboard feedback
const MOCK_METRICS = {
  1: { inertia: 12450, silhouette: 0.00 },
  2: { inertia: 8200,  silhouette: 0.52 },
  3: { inertia: 5100,  silhouette: 0.68 },
  4: { inertia: 2800,  silhouette: 0.85 }, // Sweet spot
  5: { inertia: 2400,  silhouette: 0.71 },
  6: { inertia: 2100,  silhouette: 0.62 },
  7: { inertia: 1850,  silhouette: 0.55 },
  8: { inertia: 1600,  silhouette: 0.48 },
  9: { inertia: 1450,  silhouette: 0.42 },
  10: { inertia: 1300, silhouette: 0.38 }
};

export default function App() {
  const [kValue, setKValue] = useState<number>(4);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [displayedInertia, setDisplayedInertia] = useState<number>(MOCK_METRICS[4].inertia);
  
  const minK = 1;
  const maxK = 10;
  
  const currentMetrics = MOCK_METRICS[kValue as keyof typeof MOCK_METRICS];
  
  // Smoothly animate the inertia number changing
  useEffect(() => {
    let start = displayedInertia;
    const end = currentMetrics.inertia;
    const duration = 400; // ms
    const startTime = performance.now();
    
    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (easeOutQuad)
      const easeProgress = progress * (2 - progress);
      const current = Math.round(start + (end - start) * easeProgress);
      
      setDisplayedInertia(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMetrics.inertia]);

  // Generate stable but random-looking positions for our cluster blobs
  const clusterPositions = useMemo(() => {
    return Array.from({ length: maxK }).map((_, i) => ({
      x: 15 + Math.random() * 70, // 15% to 85%
      y: 15 + Math.random() * 70, // 15% to 85%
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 2
    }));
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKValue(parseInt(e.target.value, 10));
  };

  const percentage = ((kValue - minK) / (maxK - minK)) * 100;
  const activeColor = CANDY_COLORS[kValue - 1];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      {/* Inline styles for custom animations to avoid external CSS requirements */}
      <style>{`
        @keyframes blob-float {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(8px, -12px) scale(1.08); }
          66% { transform: translate(-8px, 6px) scale(0.95); }
        }
        .blob-anim {
          animation: blob-float ease-in-out infinite;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          opacity: 0;
        }
        input[type=range]::-moz-range-thumb {
          opacity: 0;
          border: none;
        }
      `}</style>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
        
        {/* Top Header */}
        <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm transition-colors duration-500"
              style={{ backgroundColor: activeColor + '40', color: activeColor }}
            >
              <SlidersHorizontal className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">K-Means Control</h2>
              <p className="text-xs font-medium text-slate-400">Cluster Parameters</p>
            </div>
          </div>
          <div className="flex items-baseline gap-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <span className="text-sm font-bold text-slate-400">K =</span>
            <span className="text-xl font-black text-slate-700">{kValue}</span>
          </div>
        </div>

        {/* Live Visualization Canvas */}
        <div className="relative h-48 bg-slate-50/50 border-y border-slate-100 overflow-hidden group">
          <div className="absolute inset-0 opacity-20 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <span className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide text-slate-500 shadow-sm border border-slate-100">
              <Activity className="w-3 h-3 text-pink-400" />
              INERTIA: {displayedInertia.toLocaleString()}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide text-slate-500 shadow-sm border border-slate-100">
              <Target className="w-3 h-3 text-cyan-400" />
              SILHOUETTE: {currentMetrics.silhouette.toFixed(2)}
            </span>
          </div>

          {/* Render Cluster Blobs */}
          {CANDY_COLORS.map((color, index) => {
            const isActive = index < kValue;
            const pos = clusterPositions[index];
            
            return (
              <div
                key={index}
                className="absolute w-12 h-12 rounded-full mix-blend-multiply transition-all duration-700 ease-out flex items-center justify-center shadow-lg"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  backgroundColor: color,
                  opacity: isActive ? 0.85 : 0,
                  transform: isActive ? 'scale(1)' : 'scale(0) translateY(20px)',
                  pointerEvents: isActive ? 'auto' : 'none',
                  zIndex: isActive ? 10 : 0
                }}
              >
                <div 
                  className="w-full h-full rounded-full blob-anim flex items-center justify-center relative"
                  style={{
                    animationDelay: `${pos.delay}s`,
                    animationDuration: `${pos.duration}s`
                  }}
                >
                  <div className="w-2 h-2 bg-white/60 rounded-full" />
                  
                  {/* Subtle pulsing ring for active centroids */}
                  <div 
                    className="absolute inset-[-4px] rounded-full border border-white/40"
                    style={{ animation: 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite', animationDelay: `${pos.delay}s` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Slider Section */}
        <div className="p-8 pb-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Number of Clusters
            </h3>
            {kValue === 4 && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Optimal
              </span>
            )}
          </div>

          {/* Custom Slider Track & Thumb Overlay container */}
          <div className="relative h-12 flex items-center">
            
            {/* Visual Background Track */}
            <div className="absolute left-0 right-0 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              {/* Fill Track */}
              <div 
                className="h-full rounded-full transition-all duration-200 ease-out"
                style={{ 
                  width: `${percentage}%`,
                  background: `linear-gradient(90deg, ${CANDY_COLORS[0]}, ${activeColor})`
                }}
              />
            </div>

            {/* Custom Thumb Element */}
            <div 
              className="absolute h-8 w-8 bg-white rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.1)] border-4 transition-all duration-200 ease-out flex items-center justify-center pointer-events-none z-10"
              style={{
                left: `calc(${percentage}% - 16px)`,
                borderColor: activeColor,
                transform: isDragging ? 'scale(1.15)' : 'scale(1)'
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeColor }} />
            </div>

            {/* Hidden native input for functionality */}
            <input 
              type="range"
              min={minK}
              max={maxK}
              step="1"
              value={kValue}
              onChange={handleSliderChange}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              aria-label="Number of Clusters (K)"
            />
          </div>

          {/* Ticks and Labels */}
          <div className="flex justify-between mt-2 px-[10px]">
            {Array.from({ length: maxK }).map((_, i) => {
              const val = i + 1;
              const isSelected = val === kValue;
              const isPassed = val <= kValue;
              
              return (
                <div key={val} className="flex flex-col items-center gap-1">
                  <div 
                    className={`w-1 h-1 rounded-full transition-colors duration-300 ${
                      isPassed ? 'bg-slate-300' : 'bg-slate-200'
                    }`}
                  />
                  <span 
                    className={`text-[11px] font-semibold transition-colors duration-300 ${
                      isSelected ? 'text-slate-700 scale-110' : 'text-slate-400'
                    }`}
                  >
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}