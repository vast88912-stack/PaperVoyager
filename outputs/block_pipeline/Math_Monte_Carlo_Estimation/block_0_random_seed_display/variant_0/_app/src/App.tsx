import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- PRNG Utilities for Reproducible Monte Carlo ---
// cyrb128 hashes a string to a 128-bit state
const cyrb128 = (str: string) => {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
};

// sfc32 is a fast, high-quality PRNG
const sfc32 = (a: number, b: number, c: number, d: number) => {
  return function () {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  };
};

// Generate a random hex string for new seeds
const generateRandomSeedString = () => {
  return Math.random().toString(16).substring(2, 10).toUpperCase();
};

export default function App() {
  const [seed, setSeed] = useState<string>('QUANT-MC-01');
  const [sequence, setSequence] = useState<number[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [sampleSize, setSampleSize] = useState(100);
  
  const replayRef = useRef<number>();

  const generateSequence = useCallback((currentSeed: string, size: number) => {
    const seedHash = cyrb128(currentSeed);
    const prng = sfc32(seedHash[0], seedHash[1], seedHash[2], seedHash[3]);
    const seq = [];
    for (let i = 0; i < size; i++) {
      seq.push(prng());
    }
    return seq;
  }, []);

  // Instantly update sequence when seed or sample size changes (unless replaying)
  useEffect(() => {
    if (!isReplaying) {
      setSequence(generateSequence(seed, sampleSize));
    }
  }, [seed, sampleSize, isReplaying, generateSequence]);

  const handleRandomizeSeed = () => {
    if (isReplaying) return;
    setSeed(generateRandomSeedString());
  };

  const handleReplay = () => {
    if (isReplaying) return;
    setIsReplaying(true);
    setSequence([]);
    
    const fullSequence = generateSequence(seed, sampleSize);
    let currentIndex = 0;

    const animate = () => {
      if (currentIndex < fullSequence.length) {
        setSequence(prev => [...prev, fullSequence[currentIndex]]);
        currentIndex++;
        // Speed up replay for larger sample sizes
        const stepsPerFrame = Math.max(1, Math.floor(sampleSize / 50));
        for(let i = 1; i < stepsPerFrame && currentIndex < fullSequence.length; i++) {
            setSequence(prev => [...prev, fullSequence[currentIndex]]);
            currentIndex++;
        }
        replayRef.current = requestAnimationFrame(animate);
      } else {
        setIsReplaying(false);
      }
    };

    replayRef.current = requestAnimationFrame(animate);
  };

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (replayRef.current) cancelAnimationFrame(replayRef.current);
    };
  }, []);

  // Calculate basic statistics to prove uniform distribution
  const mean = sequence.length > 0 ? sequence.reduce((a, b) => a + b, 0) / sequence.length : 0;
  const variance = sequence.length > 0 ? sequence.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sequence.length : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans p-6 flex flex-col items-center justify-center">
      
      <div className="max-w-4xl w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-teal-500/20 flex items-center justify-center border border-teal-500/50">
              <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold tracking-wide text-gray-100">
              Monte Carlo Lab <span className="text-gray-500 font-normal">| Seed Engine</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full">
              Deterministic PRNG
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8 flex flex-col gap-8">
          
          {/* Seed Input & Controls */}
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Master Random Seed
            </label>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  disabled={isReplaying}
                  className="w-full bg-gray-950 border-2 border-gray-800 focus:border-teal-500 rounded-xl py-4 px-6 text-3xl font-mono text-teal-400 shadow-inner outline-none transition-colors disabled:opacity-50"
                  placeholder="Enter seed..."
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                  <button
                    onClick={handleRandomizeSeed}
                    disabled={isReplaying}
                    className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
                    title="Generate Random Seed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleReplay}
                disabled={isReplaying || !seed}
                className="px-8 py-4 bg-orange-500 hover:bg-orange-400 text-gray-950 font-bold rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
              >
                {isReplaying ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Replaying...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Reproducible Replay
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sample Size Slider */}
          <div className="flex flex-col gap-2">
             <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Sample Size (N)
                </label>
                <span className="text-teal-400 font-mono">{sampleSize}</span>
             </div>
             <input 
                type="range" 
                min="10" 
                max="500" 
                step="10"
                value={sampleSize}
                onChange={(e) => setSampleSize(parseInt(e.target.value))}
                disabled={isReplaying}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-teal-500 disabled:opacity-50"
             />
          </div>

          {/* Sequence Visualizer (Scatter/Bar Plot) */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                Generated Sequence Distribution
              </label>
              <div className="flex gap-4 text-xs font-mono text-gray-500">
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">μ:</span>
                  <span className={Math.abs(mean - 0.5) < 0.05 ? "text-teal-400" : "text-orange-400"}>
                    {mean.toFixed(4)}
                  </span>
                  <span className="text-gray-600 ml-1">(target: 0.5)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">σ²:</span>
                  <span className={Math.abs(variance - 0.0833) < 0.02 ? "text-teal-400" : "text-orange-400"}>
                    {variance.toFixed(4)}
                  </span>
                  <span className="text-gray-600 ml-1">(target: ~0.083)</span>
                </div>
              </div>
            </div>
            
            <div className="h-48 bg-gray-950 border border-gray-800 rounded-xl p-4 flex items-end gap-[2px] overflow-hidden relative">
              {/* Target Mean Line */}
              <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-gray-700/50 z-0 pointer-events-none"></div>
              
              {sequence.map((val, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-teal-500/80 hover:bg-orange-400 transition-colors rounded-t-sm z-10 relative group"
                  style={{ height: `${val * 100}%` }}
                >
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-gray-200 text-xs py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20">
                    {val.toFixed(4)}
                  </div>
                </div>
              ))}
              
              {/* Empty state filler if sequence is empty during replay start */}
              {sequence.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-mono text-sm">
                  Initializing PRNG state...
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      
      {/* Footer Note */}
      <div className="mt-6 text-gray-500 text-sm font-mono text-center max-w-2xl">
        <p>In Monte Carlo simulations, a deterministic pseudo-random number generator (PRNG) ensures that complex stochastic models can be exactly reproduced by sharing a single seed.</p>
      </div>
    </div>
  );
}