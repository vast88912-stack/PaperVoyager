import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Dices, 
  Copy, 
  Check, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Hash, 
  Activity,
  Terminal
} from 'lucide-react';

// Pseudo-random hash to generate deterministic "entropy" bars based on the seed
const generateEntropySignature = (seed: string): number[] => {
  let h = 0xdeadbeef;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
  }
  h = ((h ^ h >>> 16) >>> 0);
  
  const values = [];
  for (let i = 0; i < 24; i++) {
    // Generate a pseudo-random height between 10 and 100
    const val = (Math.imul(h ^ (i * 1337), 1597334677) >>> 0) % 90 + 10;
    values.push(val);
  }
  return values;
};

const generateRandomHex = () => {
  return 'MC-' + Math.random().toString(16).substring(2, 10).toUpperCase();
};

export default function App() {
  const [seed, setSeed] = useState<string>('MC-A8F3B9D2');
  const [displaySeed, setDisplaySeed] = useState<string>('MC-A8F3B9D2');
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [isScrambling, setIsScrambling] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [entropy, setEntropy] = useState<number[]>([]);

  const scrambleIntervalRef = useRef<number | null>(null);

  // Update entropy signature whenever the actual seed changes
  useEffect(() => {
    setEntropy(generateEntropySignature(seed));
  }, [seed]);

  const handleGenerateSeed = useCallback(() => {
    if (isLocked) return;

    setIsScrambling(true);
    let iterations = 0;
    const maxIterations = 15;

    scrambleIntervalRef.current = window.setInterval(() => {
      setDisplaySeed(generateRandomHex());
      iterations++;

      if (iterations >= maxIterations) {
        if (scrambleIntervalRef.current !== null) {
          clearInterval(scrambleIntervalRef.current);
        }
        const finalSeed = generateRandomHex();
        setDisplaySeed(finalSeed);
        setSeed(finalSeed);
        setIsScrambling(false);
      }
    }, 40);
  }, [isLocked]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(seed);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [seed]);

  const handleSeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setDisplaySeed(val);
    setSeed(val);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (scrambleIntervalRef.current !== null) {
        clearInterval(scrambleIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-mono selection:bg-teal-900 selection:text-teal-300">
      
      {/* Main Panel */}
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Decorative Top Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-teal-400 to-orange-500" />

        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3 text-teal-400">
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 shadow-inner">
                <Terminal size={20} className="text-teal-500" />
              </div>
              <h2 className="text-lg font-semibold tracking-wide">PRNG Engine</h2>
            </div>
            
            {/* Status Badge */}
            <div className={`px-3 py-1 text-xs font-bold rounded-full border flex items-center space-x-1.5 transition-colors duration-300 ${
              isLocked 
                ? 'bg-teal-950/30 border-teal-500/30 text-teal-400' 
                : 'bg-orange-950/30 border-orange-500/30 text-orange-400'
            }`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLocked ? 'bg-teal-400' : 'bg-orange-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isLocked ? 'bg-teal-500' : 'bg-orange-500'}`}></span>
              </span>
              <span>{isLocked ? 'DETERMINISTIC' : 'STOCHASTIC'}</span>
            </div>
          </div>

          {/* Seed Input Display */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-widest flex items-center space-x-2">
                <Hash size={14} />
                <span>Current Seed</span>
              </label>
            </div>

            <div className="relative group">
              <input
                type="text"
                value={displaySeed}
                onChange={handleSeedChange}
                disabled={isLocked || isScrambling}
                className={`w-full bg-slate-950 text-2xl tracking-widest font-bold rounded-xl py-4 pl-6 pr-14 border outline-none transition-all duration-300 ${
                  isLocked 
                    ? 'border-slate-800 text-slate-400 cursor-not-allowed' 
                    : 'border-teal-500/50 text-teal-300 focus:border-teal-400 focus:shadow-[0_0_15px_rgba(45,212,191,0.2)]'
                } ${isScrambling ? 'animate-pulse text-orange-400' : ''}`}
                spellCheck={false}
              />
              <button
                onClick={handleCopy}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-teal-400 transition-colors p-2"
                title="Copy Seed"
              >
                {isCopied ? <Check size={20} className="text-teal-500" /> : <Copy size={20} />}
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6 flex space-x-4">
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg font-bold text-sm transition-all duration-300 border ${
                isLocked
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-teal-950/40 border-teal-500/50 text-teal-400 hover:bg-teal-900/60'
              }`}
            >
              {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
              <span>{isLocked ? 'UNLOCK SEED' : 'LOCK SEED'}</span>
            </button>

            <button
              onClick={handleGenerateSeed}
              disabled={isLocked || isScrambling}
              className={`flex-[2] flex items-center justify-center space-x-2 py-3 rounded-lg font-bold text-sm transition-all duration-300 ${
                isLocked
                  ? 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_20px_rgba(234,88,12,0.3)] hover:shadow-[0_0_25px_rgba(234,88,12,0.5)]'
              }`}
            >
              <RefreshCw size={16} className={isScrambling ? 'animate-spin' : ''} />
              <span>{isScrambling ? 'GENERATING...' : 'GENERATE NEW SEED'}</span>
            </button>
          </div>

          {/* Entropy Visualizer */}
          <div className="mt-10 pt-6 border-t border-slate-800/50">
            <div className="flex items-center space-x-2 text-xs text-slate-500 uppercase tracking-widest mb-4">
              <Activity size={14} className="text-teal-500" />
              <span>Entropy Signature</span>
            </div>
            
            <div className="h-16 flex items-end justify-between space-x-1">
              {entropy.map((val, idx) => (
                <div 
                  key={idx}
                  className="w-full rounded-t-sm transition-all duration-500 ease-out"
                  style={{ 
                    height: `${val}%`,
                    backgroundColor: idx % 4 === 0 ? '#f97316' : '#2dd4bf', // Orange and Teal mix
                    opacity: isScrambling ? 0.3 : 0.8 + (val / 500)
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-slate-600 font-bold tracking-widest">
              <span>0x00</span>
              <span>DISTRIBUTION</span>
              <span>0xFF</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}