import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Dna, 
  RefreshCw, 
  Hash, 
  PlaySquare, 
  Settings2, 
  BarChart3, 
  LineChart,
  Network
} from 'lucide-react';

// --- PRNG Utility Functions ---
// Converts a string seed into a 32-bit integer array
function cyrb128(str: string): number[] {
  let h1 = 1779033703, h2 = 3144134277,
      h3 = 1013904242, h4 = 2773480762;
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
  return [(h1^h2^h3^h4)>>>0, (h2^h1)>>>0, (h3^h1)>>>0, (h4^h1)>>>0];
}

// Mulberry32 PRNG
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

const generateHexSeed = () => {
  return Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
};

export default function App() {
  const [seed, setSeed] = useState<string>(generateHexSeed());
  const [inputValue, setInputValue] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleGenerateNew = () => {
    setIsAnimating(true);
    setTimeout(() => {
      const newSeed = generateHexSeed();
      setSeed(newSeed);
      setInputValue('');
      setIsAnimating(false);
    }, 300);
  };

  const handleSetSeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setSeed(inputValue.trim().toUpperCase());
    }
  };

  // Draw "Entropy Matrix" to visually prove the deterministic nature of the seed
  const drawEntropyMatrix = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cols = 32;
    const rows = 12;
    const cellW = width / cols;
    const cellH = height / rows;

    ctx.clearRect(0, 0, width, height);

    // Initialize PRNG with the current seed
    const seedInt = cyrb128(seed)[0];
    const rand = mulberry32(seedInt);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const val = rand();
        
        // Quant-themed colors based on random value
        // Teal (#2dd4bf) to Orange (#fb923c)
        if (val > 0.9) {
          ctx.fillStyle = `rgba(251, 146, 60, ${val})`; // Orange highlights
        } else if (val > 0.5) {
          ctx.fillStyle = `rgba(45, 212, 191, ${val * 0.8})`; // Teal dominant
        } else {
          ctx.fillStyle = `rgba(30, 41, 59, ${val + 0.2})`; // Slate background dots
        }

        ctx.beginPath();
        // Draw varied shapes based on seed bits
        if (rand() > 0.7) {
            ctx.arc(x * cellW + cellW/2, y * cellH + cellH/2, (cellW/2) * 0.8, 0, Math.PI * 2);
        } else {
            ctx.rect(x * cellW + cellW * 0.1, y * cellH + cellH * 0.1, cellW * 0.8, cellH * 0.8);
        }
        ctx.fill();
      }
    }
  }, [seed]);

  useEffect(() => {
    drawEntropyMatrix();
  }, [seed, drawEntropyMatrix]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-4 md:p-8 flex flex-col items-center">
      
      {/* Header & Context Tabs */}
      <div className="w-full max-w-5xl mb-8">
        <header className="flex items-center gap-3 mb-6">
          <Network className="w-8 h-8 text-teal-400" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Monte Carlo <span className="text-teal-400">Estimator Lab</span>
          </h1>
        </header>

        <nav className="flex space-x-1 border-b border-slate-800 pb-px">
          <button className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-300 flex items-center gap-2 rounded-t-lg transition-colors">
            <BarChart3 className="w-4 h-4" /> Pi Estimation
          </button>
          <button className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-300 flex items-center gap-2 rounded-t-lg transition-colors">
            <LineChart className="w-4 h-4" /> Area Integration
          </button>
          <button className="px-4 py-2 text-sm font-medium text-teal-400 border-b-2 border-teal-400 flex items-center gap-2 bg-slate-900/50 rounded-t-lg">
            <Settings2 className="w-4 h-4" /> Global Config
          </button>
        </nav>
      </div>

      {/* Main Content - Seed Display Module */}
      <main className="w-full max-w-3xl">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl shadow-black/50">
          
          <div className="p-6 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                <Dna className="w-5 h-5 text-orange-400" />
                Random Seed Generator
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Controls the deterministic PRNG for all Monte Carlo simulations.
              </p>
            </div>
            <div className="px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-mono font-bold tracking-widest">
              PRNG: MULBERRY32
            </div>
          </div>

          <div className="p-8 space-y-8">
            
            {/* Seed Display Area */}
            <div className="flex flex-col items-center">
              <label className="text-xs uppercase tracking-widest text-slate-500 mb-3 font-semibold">
                Active System Seed
              </label>
              <div className="relative group w-full max-w-md">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500 to-orange-500 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                <div className="relative bg-slate-950 border border-slate-700 rounded-lg p-6 flex items-center justify-center shadow-[inset_0_2px_20px_rgba(0,0,0,0.8)]">
                  <span 
                    className={`font-mono text-4xl sm:text-5xl tracking-[0.2em] text-orange-400 transition-opacity duration-200 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
                    style={{ textShadow: '0 0 20px rgba(251, 146, 60, 0.4)' }}
                  >
                    {seed}
                  </span>
                </div>
              </div>
            </div>

            {/* Entropy Visualization */}
            <div className="w-full bg-slate-950 rounded-lg border border-slate-800 p-2">
               <div className="flex justify-between items-center px-2 mb-2">
                 <span className="text-[10px] uppercase text-slate-500 tracking-wider">Entropy Verification Matrix</span>
                 <span className="text-[10px] uppercase text-slate-500 tracking-wider">Deterministic State</span>
               </div>
               <canvas 
                  ref={canvasRef} 
                  width={640} 
                  height={120} 
                  className="w-full h-24 rounded opacity-80"
                />
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              
              {/* Generate New */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-400 block">Stochastic Generation</label>
                <button 
                  onClick={handleGenerateNew}
                  className="w-full group relative flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-teal-500/50 text-slate-200 py-3 px-4 rounded-lg transition-all duration-200 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <RefreshCw className={`w-4 h-4 text-teal-400 ${isAnimating ? 'animate-spin' : ''}`} />
                  <span className="font-semibold tracking-wide">Generate New Seed</span>
                </button>
              </div>

              {/* Set Custom */}
              <form onSubmit={handleSetSeed} className="space-y-3">
                <label className="text-sm font-medium text-slate-400 block">Reproducible Replay</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Hash className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                      placeholder="Enter HEX seed..."
                      className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 block pl-10 p-3 transition-colors placeholder:text-slate-600 font-mono"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={!inputValue.trim()}
                    className="flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:border-orange-500 py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlaySquare className="w-4 h-4" />
                    <span className="font-semibold">Set</span>
                  </button>
                </div>
              </form>

            </div>

          </div>
        </div>

        {/* Mock Data Output for Context */}
        <div className="mt-8 grid grid-cols-3 gap-4 opacity-50 pointer-events-none">
           {[1, 2, 3].map((i) => (
             <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-teal-500 animate-spin"></div>
                <span className="text-xs text-slate-500">Awaiting Simulation {i}</span>
             </div>
           ))}
        </div>

      </main>
    </div>
  );
}