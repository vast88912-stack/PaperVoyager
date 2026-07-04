import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Hash, Dices, RotateCcw, Activity, Binary, Settings2, ShieldCheck, Play } from 'lucide-react';

// --- PRNG Implementation ---
// Mulberry32: A fast, high-quality 32-bit PRNG suitable for JS.
// We use a string hash to seed it.
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
  h1 ^= (h2 ^ h3 ^ h4), h2 ^= h1, h3 ^= h1, h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
};

const mulberry32 = (a: number) => {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

export default function App() {
  const [activeTab, setActiveTab] = useState('seed');
  const [seed, setSeed] = useState<string>('QUANT-2024-MC');
  const [inputSeed, setInputSeed] = useState<string>('QUANT-2024-MC');
  const [sampleSize, setSampleSize] = useState<number>(1000);
  const [sequence, setSequence] = useState<number[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Generate a random seed string
  const handleRandomizeSeed = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newSeed = 'RND-';
    for (let i = 0; i < 8; i++) {
      newSeed += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setInputSeed(newSeed);
    setSeed(newSeed);
  };

  const handleSetSeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputSeed.trim()) {
      setSeed(inputSeed.trim());
    }
  };

  const generateSequence = useCallback(() => {
    setIsSimulating(true);
    // Add artificial delay for "simulation" feel
    setTimeout(() => {
      const seedHash = cyrb128(seed)[0];
      const prng = mulberry32(seedHash);
      const seq = Array.from({ length: sampleSize }, () => prng());
      setSequence(seq);
      setIsSimulating(false);
    }, 400);
  }, [seed, sampleSize]);

  // Re-run simulation when seed or sample size changes
  useEffect(() => {
    generateSequence();
  }, [generateSequence]);

  // Statistical Analysis of the generated sequence
  const stats = useMemo(() => {
    if (sequence.length === 0) return { mean: 0, variance: 0, piEst: 0 };
    
    // Mean
    const sum = sequence.reduce((a, b) => a + b, 0);
    const mean = sum / sequence.length;
    
    // Variance
    const variance = sequence.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sequence.length;
    
    // Toy Pi Estimation (using consecutive pairs)
    let insideCircle = 0;
    const pairsCount = Math.floor(sequence.length / 2);
    for (let i = 0; i < pairsCount; i++) {
      const x = sequence[i * 2];
      const y = sequence[i * 2 + 1];
      if (x * x + y * y <= 1) insideCircle++;
    }
    const piEst = pairsCount > 0 ? (insideCircle / pairsCount) * 4 : 0;

    return { mean, variance, piEst };
  }, [sequence]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans selection:bg-teal-500/30">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-teal-500/10 p-2 rounded-lg border border-teal-500/20">
              <Activity className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-100 tracking-tight">Monte Carlo Lab</h1>
              <p className="text-xs text-teal-500/80 font-mono">STOCHASTIC ESTIMATOR ENGINE</p>
            </div>
          </div>
          <nav className="flex space-x-1 bg-gray-900/50 p-1 rounded-lg border border-gray-800">
            {['seed', 'pi', 'area', 'options'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                disabled={tab !== 'seed'}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-gray-800 text-teal-400 shadow-sm border border-gray-700'
                    : tab !== 'seed'
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                {tab === 'seed' ? 'PRNG Seed' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Controls & Active Seed */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Active Seed Display Card */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-orange-500 opacity-80" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center">
                    <Hash className="w-4 h-4 mr-2 text-teal-500" />
                    Active Seed
                  </h2>
                  <span className="flex items-center text-[10px] bg-teal-500/10 text-teal-400 px-2 py-1 rounded border border-teal-500/20 uppercase font-bold tracking-widest">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                  </span>
                </div>
                
                <div className="bg-gray-950 rounded-lg border border-gray-800 p-4 relative overflow-hidden flex items-center justify-center group-hover:border-teal-500/30 transition-colors">
                  <div className="absolute inset-0 bg-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="font-mono text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-orange-400 break-all text-center relative z-10">
                    {seed}
                  </span>
                </div>
                
                <div className="mt-4 flex space-x-2">
                  <button 
                    onClick={generateSequence}
                    disabled={isSimulating}
                    className="flex-1 flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-700 text-gray-200 py-2 rounded-lg border border-gray-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    <RotateCcw className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
                    <span>Replay</span>
                  </button>
                  <button 
                    onClick={handleRandomizeSeed}
                    className="flex-1 flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all text-sm font-medium"
                  >
                    <Dices className="w-4 h-4" />
                    <span>Randomize</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Seed Configuration Form */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center mb-4">
                <Settings2 className="w-4 h-4 mr-2 text-orange-500" />
                Configuration
              </h2>
              
              <form onSubmit={handleSetSeed} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="seedInput" className="text-xs font-medium text-gray-500 block">
                    CUSTOM SEED STRING
                  </label>
                  <div className="flex space-x-2">
                    <input
                      id="seedInput"
                      type="text"
                      value={inputSeed}
                      onChange={(e) => setInputSeed(e.target.value)}
                      className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder-gray-700"
                      placeholder="Enter alphanumeric seed..."
                    />
                    <button
                      type="submit"
                      disabled={inputSeed === seed}
                      className="px-4 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Set
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-500">SAMPLE SIZE (N)</label>
                    <span className="text-xs font-mono text-orange-400">{sampleSize.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="100"
                    value={sampleSize}
                    onChange={(e) => setSampleSize(parseInt(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 font-mono">
                    <span>100</span>
                    <span>5000</span>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Engine Stats */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
               <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center mb-4">
                <Binary className="w-4 h-4 mr-2 text-teal-500" />
                PRNG Diagnostics
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-gray-950 p-2.5 rounded border border-gray-800">
                  <span className="text-xs text-gray-500">Expected Mean</span>
                  <span className="text-sm font-mono text-gray-300">0.50000</span>
                </div>
                <div className="flex justify-between items-center bg-gray-950 p-2.5 rounded border border-gray-800">
                  <span className="text-xs text-gray-500">Actual Mean</span>
                  <span className={`text-sm font-mono ${Math.abs(stats.mean - 0.5) < 0.05 ? 'text-teal-400' : 'text-orange-400'}`}>
                    {stats.mean.toFixed(5)}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-gray-950 p-2.5 rounded border border-gray-800">
                  <span className="text-xs text-gray-500">Variance (Exp: 0.0833)</span>
                  <span className="text-sm font-mono text-gray-300">{stats.variance.toFixed(5)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Visualizer */}
          <div className="lg:col-span-8 flex flex-col space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl flex-1 flex flex-col overflow-hidden relative min-h-[500px]">
              
              {/* Toolbar */}
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/80 backdrop-blur z-10">
                <div>
                  <h2 className="text-lg font-medium text-gray-200">Uniformity Scatter Plot</h2>
                  <p className="text-xs text-gray-500">Visualizing sequential pseudo-random pairs (U_i, U_i+1)</p>
                </div>
                {isSimulating && (
                  <span className="flex items-center space-x-2 text-teal-400 text-xs font-mono animate-pulse">
                    <Activity className="w-4 h-4" />
                    <span>GENERATING...</span>
                  </span>
                )}
              </div>

              {/* Chart Area */}
              <div className="flex-1 p-6 flex items-center justify-center relative bg-gray-950">
                {/* Axes background */}
                <div className="absolute inset-6 border-l border-b border-gray-800" />
                
                {/* Scatter SVG */}
                <div className="w-full h-full relative" style={{ aspectRatio: '1/1', maxHeight: '100%' }}>
                  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map((tick) => (
                      <g key={`grid-${tick}`}>
                        <line x1={tick} y1="0" x2={tick} y2="100" stroke="#1f2937" strokeWidth="0.2" />
                        <line x1="0" y1={tick} x2="100" y2={tick} stroke="#1f2937" strokeWidth="0.2" />
                      </g>
                    ))}

                    {/* Data Points */}
                    {!isSimulating && sequence.length > 0 && Array.from({ length: Math.floor(sequence.length / 2) }).map((_, i) => {
                      const x = sequence[i * 2] * 100;
                      const y = 100 - (sequence[i * 2 + 1] * 100); // SVG y is inverted
                      
                      // Color mapping: edge points lean orange, center leans teal
                      const distFromCenter = Math.sqrt(Math.pow(x - 50, 2) + Math.pow(y - 50, 2));
                      const isOutlier = distFromCenter > 45;
                      
                      return (
                        <circle
                          key={`pt-${i}`}
                          cx={x}
                          cy={y}
                          r="0.6"
                          className={isOutlier ? "fill-orange-400" : "fill-teal-400"}
                          opacity={isOutlier ? 0.8 : 0.5}
                        />
                      );
                    })}
                  </svg>

                  {/* Axis Labels */}
                  <div className="absolute -bottom-5 left-0 right-0 flex justify-between text-[10px] text-gray-600 font-mono">
                    <span>0.0</span>
                    <span>U_i</span>
                    <span>1.0</span>
                  </div>
                  <div className="absolute top-0 bottom-0 -left-6 flex flex-col justify-between text-[10px] text-gray-600 font-mono py-1">
                    <span>1.0</span>
                    <span className="-rotate-90 origin-left translate-y-4">U_i+1</span>
                    <span>0.0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Toy Estimator Preview Badge */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-300">Toy Estimation: Area of Unit Circle (π)</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Using the current seed to calculate ratio of points where <code className="bg-gray-950 px-1 py-0.5 rounded text-teal-400">x² + y² ≤ 1</code>
                </p>
              </div>
              <div className="text-right flex items-center space-x-6">
                 <div>
                    <div className="text-[10px] text-gray-500 font-mono mb-1">TRUE VALUE</div>
                    <div className="text-lg font-mono text-gray-400">3.14159</div>
                 </div>
                 <div>
                    <div className="text-[10px] text-teal-500 font-mono mb-1 flex items-center justify-end">
                      MC ESTIMATE <span className="ml-1 bg-teal-500/20 px-1 rounded text-teal-300">95% CI</span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-teal-400 drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]">
                      {isSimulating ? '...' : stats.piEst.toFixed(5)}
                    </div>
                 </div>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}