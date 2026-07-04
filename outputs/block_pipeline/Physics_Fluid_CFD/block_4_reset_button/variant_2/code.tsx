import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function App() {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; angle: number; speed: number; color: string }[]>([]);
  const [resetCount, setResetCount] = useState(0);

  const requestRef = useRef<number>();
  const holdStartTime = useRef<number>(0);
  const HOLD_DURATION = 800; // ms required to hold

  const colors = ['#06b6d4', '#ec4899', '#8b5cf6', '#3b82f6']; // cyan, pink, purple, blue

  const triggerReset = useCallback(() => {
    setIsResetting(true);
    setResetCount((c) => c + 1);
    
    // Generate particles for the visual burst
    const newParticles = Array.from({ length: 30 }).map((_, i) => ({
      id: Date.now() + i,
      x: 50, // center %
      y: 50, // center %
      angle: Math.random() * Math.PI * 2,
      speed: 20 + Math.random() * 80,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(newParticles);

    // Mock reset completion
    setTimeout(() => {
      setIsResetting(false);
      setProgress(0);
      setParticles([]);
    }, 1500);
  }, []);

  const animateFill = useCallback((timestamp: number) => {
    if (!holdStartTime.current) holdStartTime.current = timestamp;
    const elapsed = timestamp - holdStartTime.current;
    
    const currentProgress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
    setProgress(currentProgress);

    if (currentProgress < 100) {
      requestRef.current = requestAnimationFrame(animateFill);
    } else {
      triggerReset();
    }
  }, [triggerReset]);

  const animateDrain = useCallback(() => {
    setProgress((prev) => {
      const next = Math.max(prev - 5, 0);
      if (next > 0) {
        requestRef.current = requestAnimationFrame(animateDrain);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (isHolding && !isResetting) {
      holdStartTime.current = performance.now() - (progress / 100) * HOLD_DURATION;
      requestRef.current = requestAnimationFrame(animateFill);
    } else if (!isHolding && progress > 0 && !isResetting) {
      requestRef.current = requestAnimationFrame(animateDrain);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isHolding, isResetting, animateFill, animateDrain, progress]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only left click or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (!isResetting) setIsHolding(true);
  };

  const handlePointerUp = () => {
    setIsHolding(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 font-sans selection:bg-cyan-500/30">
      {/* Contextual Header */}
      <div className="mb-12 text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-100 tracking-wider">FLUID SANDBOX</h1>
        <p className="text-sm text-gray-500">Hold button to purge simulation grid</p>
      </div>

      {/* Reset Button Container */}
      <div className="relative flex flex-col items-center">
        
        {/* Particle Layer */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full opacity-0"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${Math.random() * 6 + 2}px`,
                height: `${Math.random() * 6 + 2}px`,
                backgroundColor: p.color,
                boxShadow: `0 0 10px ${p.color}`,
                animation: `burst 1s cubic-bezier(0.1, 0.8, 0.3, 1) forwards`,
                transform: `translate(-50%, -50%)`,
                '--tx': `${Math.cos(p.angle) * p.speed}px`,
                '--ty': `${Math.sin(p.angle) * p.speed}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* The Button */}
        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className={`
            group relative z-10 w-64 h-20 rounded-2xl overflow-hidden
            border border-gray-800 bg-gray-900/50 backdrop-blur-sm
            transition-transform duration-200 ease-out
            ${isHolding && !isResetting ? 'scale-[0.98]' : 'scale-100'}
            ${isResetting ? 'pointer-events-none border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.3)]' : 'hover:border-gray-700'}
          `}
        >
          {/* Liquid Fill Element */}
          <div 
            className="absolute bottom-0 left-0 right-0 w-full bg-gradient-to-t from-cyan-600 via-cyan-500 to-cyan-400 opacity-90 transition-transform duration-75 ease-linear origin-bottom"
            style={{ 
              height: '100%',
              transform: `scaleY(${progress / 100})`,
              boxShadow: progress > 0 ? '0 -10px 20px rgba(6, 182, 212, 0.5)' : 'none'
            }}
          >
            {/* Liquid Surface Waves (Simulated with pseudo-opacity layers) */}
            {progress > 0 && progress < 100 && (
              <div className="absolute top-0 left-0 right-0 h-2 bg-white/30 animate-pulse" />
            )}
          </div>

          {/* Button Content */}
          <div className="absolute inset-0 flex items-center justify-center space-x-3 pointer-events-none">
            {isResetting ? (
              <>
                <svg className="w-6 h-6 text-white animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-white font-bold tracking-widest text-lg">PURGING...</span>
              </>
            ) : (
              <>
                <svg 
                  className={`w-6 h-6 transition-colors duration-200 ${progress > 50 ? 'text-white' : 'text-cyan-500'}`} 
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className={`font-bold tracking-widest text-lg transition-colors duration-200 ${progress > 50 ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                  {progress > 0 ? 'HOLD TO PURGE' : 'PURGE FLUID'}
                </span>
              </>
            )}
          </div>

          {/* Glare effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </button>

        {/* Status Indicator / Stats */}
        <div className="mt-8 flex items-center space-x-4 text-xs font-mono text-gray-600">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>GRID STABLE</span>
          </div>
          <span>|</span>
          <span>PURGES: {resetCount}</span>
        </div>
      </div>

      <style>{`
        @keyframes burst {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0);
          }
        }
      `}</style>
    </div>
  );
}