import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Play, RefreshCw, Settings2, Activity, ShieldAlert, Zap, 
  Dna, Calculator, TrendingUp, ShieldCheck 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Area, ComposedChart, ReferenceLine 
} from 'recharts';

// --- Unified PRNG & Math Utilities ---

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

const generateRandomSeedString = () => {
  return Math.random().toString(16).substring(2, 10).toUpperCase();
};

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const boxMuller = (prng: () => number = Math.random) => {
  let u = 0, v = 0;
  while (u === 0) u = prng();
  while (v === 0) v = prng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

const randExp = (prng: () => number = Math.random) => -Math.log(1 - prng());

// --- Module 1: Random Seed Display ---
function Module1_RandomSeed() {
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

  useEffect(() => {
    return () => {
      if (replayRef.current) cancelAnimationFrame(replayRef.current);
    };
  }, []);

  const mean = sequence.length > 0 ? sequence.reduce((a, b) => a + b, 0) / sequence.length : 0;
  const variance = sequence.length > 0 ? sequence.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sequence.length : 0;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-slate-900 border-b border-slate-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-teal-500/20 flex items-center justify-center border border-teal-500/50">
              <Activity className="w-5 h-5 text-teal-400" />
            </div>
            <h1 className="text-xl font-semibold tracking-wide text-slate-100">
              Monte Carlo Lab <span className="text-slate-500 font-normal">| Seed Engine</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full">
              Deterministic PRNG
            </span>
          </div>
        </div>

        <div className="p-8 flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Master Random Seed
            </label>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  disabled={isReplaying}
                  className="w-full bg-slate-950 border-2 border-slate-800 focus:border-teal-500 rounded-xl py-4 px-6 text-3xl font-mono text-teal-400 shadow-inner outline-none transition-colors disabled:opacity-50"
                  placeholder="Enter seed..."
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                  <button
                    onClick={handleRandomizeSeed}
                    disabled={isReplaying}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
                    title="Generate Random Seed"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleReplay}
                disabled={isReplaying || !seed}
                className="px-8 py-4 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
              >
                {isReplaying ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Replaying...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    Reproducible Replay
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
             <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">
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
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500 disabled:opacity-50"
             />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end">
              <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                Generated Sequence Distribution
              </label>
              <div className="flex gap-4 text-xs font-mono text-slate-500">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">μ:</span>
                  <span className={Math.abs(mean - 0.5) < 0.05 ? "text-teal-400" : "text-orange-400"}>
                    {mean.toFixed(4)}
                  </span>
                  <span className="text-slate-600 ml-1">(target: 0.5)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">σ²:</span>
                  <span className={Math.abs(variance - 0.0833) < 0.02 ? "text-teal-400" : "text-orange-400"}>
                    {variance.toFixed(4)}
                  </span>
                  <span className="text-slate-600 ml-1">(target: ~0.083)</span>
                </div>
              </div>
            </div>
            
            <div className="h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-end gap-[2px] overflow-hidden relative">
              <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-slate-700/50 z-0 pointer-events-none"></div>
              
              {sequence.map((val, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-teal-500/80 hover:bg-orange-400 transition-colors rounded-t-sm z-10 relative group"
                  style={{ height: `${val * 100}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-slate-200 text-xs py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20">
                    {val.toFixed(4)}
                  </div>
                </div>
              ))}
              
              {sequence.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-mono text-sm">
                  Initializing PRNG state...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 text-slate-500 text-sm font-mono text-center max-w-2xl">
        <p>In Monte Carlo simulations, a deterministic pseudo-random number generator (PRNG) ensures that complex stochastic models can be exactly reproduced by sharing a single seed.</p>
      </div>
    </div>
  );
}

// --- Module 2: Sample Size Slider ---
function Module2_SampleSize() {
  const [sliderValue, setSliderValue] = useState<number>(3.5);
  const [seed, setSeed] = useState<number>(1337);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [useVarianceReduction, setUseVarianceReduction] = useState<boolean>(false);

  const sampleSize = Math.floor(Math.pow(10, sliderValue));
  const maxSamples = 1000000;

  const simulationResult = useMemo(() => {
    const random = mulberry32(seed);
    let hits = 0;
    let sum = 0;
    let sumSq = 0;

    const iterations = Math.min(sampleSize, maxSamples);

    for (let i = 0; i < iterations; i++) {
      if (useVarianceReduction) {
        const x = random();
        const y = random();
        const x2 = 1 - x;
        const y2 = 1 - y;

        const hit1 = x * x + y * y <= 1 ? 4 : 0;
        const hit2 = x2 * x2 + y2 * y2 <= 1 ? 4 : 0;
        
        const estimate = (hit1 + hit2) / 2;
        sum += estimate;
        sumSq += estimate * estimate;
        if (hit1 === 4) hits++;
        if (hit2 === 4) hits++;
      } else {
        const x = random();
        const y = random();
        const hit = x * x + y * y <= 1 ? 4 : 0;
        sum += hit;
        sumSq += hit * hit;
        if (hit === 4) hits++;
      }
    }

    const actualN = useVarianceReduction ? iterations * 2 : iterations;
    const mean = sum / iterations;
    const variance = (sumSq / iterations - mean * mean) / iterations;
    const stdDev = Math.sqrt(variance);
    const ciLower = mean - 1.96 * stdDev;
    const ciUpper = mean + 1.96 * stdDev;
    const error = Math.abs(Math.PI - mean);

    return { estimate: mean, variance, stdDev, ciLower, ciUpper, error, actualN };
  }, [sampleSize, seed, useVarianceReduction]);

  const handleReplay = () => {
    setSeed(Math.floor(Math.random() * 100000));
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);
  const formatDecimals = (num: number, dec: number = 5) => num.toFixed(dec);
  const sliderProgress = ((sliderValue - 1) / (6 - 1)) * 100;

  return (
    <div className="w-full h-full p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200 flex items-center gap-3">
              <Activity className="w-8 h-8 text-teal-500" />
              Monte Carlo Estimator Lab
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              Experiment: <span className="text-slate-300 font-medium">Estimation of π</span>
            </p>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Seed</span>
            <code className="text-orange-400 font-mono text-lg">{seed}</code>
            <button 
              onClick={handleReplay}
              className="ml-2 p-1.5 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-teal-400"
              title="Generate new seed & replay"
            >
              <RefreshCw className={`w-4 h-4 ${isAnimating ? 'animate-spin text-teal-400' : ''}`} />
            </button>
          </div>
        </header>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-teal-500/5 blur-[100px] pointer-events-none" />
          <div className="relative z-10 space-y-10">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-teal-500" />
                  Sample Size Controller
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Adjust the number of Monte Carlo iterations ($N$)
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-mono font-bold text-teal-400 tracking-tight">
                  {formatNumber(sampleSize)}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1 font-semibold">
                  Samples Generated
                </div>
              </div>
            </div>

            <div className="relative pt-6 pb-2">
              <div className="absolute top-1/2 -translate-y-1/2 left-0 h-3 rounded-full bg-slate-800 w-full pointer-events-none" />
              <div 
                className="absolute top-1/2 -translate-y-1/2 left-0 h-3 rounded-full bg-gradient-to-r from-teal-600 to-teal-400 pointer-events-none transition-all duration-75 ease-out"
                style={{ width: `${sliderProgress}%` }}
              />
              <input
                type="range"
                min="1"
                max="6"
                step="0.01"
                value={sliderValue}
                onChange={(e) => setSliderValue(parseFloat(e.target.value))}
                className="w-full absolute top-1/2 -translate-y-1/2 left-0 h-3 opacity-0 cursor-pointer z-20"
                aria-label="Sample Size"
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-950 border-2 border-teal-400 rounded-full shadow-[0_0_15px_rgba(45,212,191,0.5)] pointer-events-none transition-all duration-75 ease-out z-10 flex items-center justify-center"
                style={{ left: `calc(${sliderProgress}% - 12px)` }}
              >
                <div className="w-2 h-2 bg-teal-400 rounded-full" />
              </div>
              <div className="flex justify-between mt-8 text-xs font-mono text-slate-500">
                <span>10¹</span><span>10²</span><span>10³</span><span>10⁴</span><span>10⁵</span><span>10⁶</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-800/50">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only"
                    checked={useVarianceReduction}
                    onChange={(e) => setUseVarianceReduction(e.target.checked)}
                  />
                  <div className={`block w-12 h-6 rounded-full transition-colors ${useVarianceReduction ? 'bg-orange-500' : 'bg-slate-700'}`} />
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${useVarianceReduction ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors flex items-center gap-2">
                  <Zap className={`w-4 h-4 ${useVarianceReduction ? 'text-orange-400' : 'text-slate-500'}`} />
                  Antithetic Variates (Variance Reduction)
                </span>
              </label>
              <button 
                onClick={handleReplay}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-lg font-medium transition-all active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                Run Simulation
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div className="text-slate-400 text-sm font-medium mb-2">Current Estimate (π)</div>
            <div className="text-3xl font-mono text-white mb-4">
              {formatDecimals(simulationResult.estimate, 6)}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">True π:</span>
              <span className="font-mono text-slate-400">3.141592...</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div className="text-slate-400 text-sm font-medium mb-2">Absolute Error</div>
            <div className="text-3xl font-mono text-orange-400 mb-4">
              {formatDecimals(simulationResult.error, 6)}
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mb-1 overflow-hidden">
              <div 
                className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((simulationResult.error / 0.1) * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Var: {simulationResult.variance.toExponential(2)}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-slate-800/50">
              <ShieldAlert className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <div className="text-slate-400 text-sm font-medium mb-2">95% Confidence Interval</div>
              <div className="bg-slate-950 border border-teal-500/30 rounded-lg p-3 inline-block mb-2">
                <div className="text-sm font-mono text-teal-300">
                  [{formatDecimals(simulationResult.ciLower, 4)}, {formatDecimals(simulationResult.ciUpper, 4)}]
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Width: {formatDecimals(simulationResult.ciUpper - simulationResult.ciLower, 5)}
              </div>
            </div>
          </div>
        </div>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-6">Variance vs. Sample Size (1/N Scaling)</h3>
          <div className="relative h-24 flex items-end gap-1">
            {Array.from({ length: 40 }).map((_, i) => {
              const barN = Math.pow(10, 1 + (i / 39) * 5);
              const isCurrent = barN <= sampleSize && barN > sampleSize / 1.5;
              const heightPct = Math.max(5, 100 / Math.sqrt(barN / 10));
              
              return (
                <div 
                  key={i}
                  className={`flex-1 rounded-t-sm transition-all duration-300 ${
                    barN <= sampleSize 
                      ? isCurrent ? 'bg-teal-400' : 'bg-teal-500/40' 
                      : 'bg-slate-800'
                  }`}
                  style={{ height: `${heightPct}%` }}
                  title={`N ≈ ${Math.round(barN)}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-slate-600 font-mono uppercase">
            <span>High Variance (Low N)</span>
            <span>Low Variance (High N)</span>
          </div>
        </section>
      </div>
    </div>
  );
}

// --- Module 3: Variance Chart ---
function Module3_VarianceChart() {
  const [sampleSize, setSampleSize] = useState<number>(1000);
  const [seed, setSeed] = useState<number>(1337);
  const [showIS, setShowIS] = useState<boolean>(true);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

  const chartRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  useEffect(() => {
    const updateSize = () => {
      if (chartRef.current) {
        setDimensions({
          width: chartRef.current.clientWidth,
          height: chartRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const chartData = useMemo(() => {
    const random = mulberry32(seed);
    const data = [];
    const steps = 100;
    const stepSize = Math.max(1, Math.floor(sampleSize / steps));
    
    const baseVarStd = 0.25; 
    const baseVarIS = 0.02;  

    for (let i = 10; i <= sampleSize; i += stepSize) {
      const noiseStd = (random() - 0.5) * (0.5 / Math.sqrt(i));
      const noiseIS = (random() - 0.5) * (0.1 / Math.sqrt(i));

      let valStd = Math.max(0.0001, (baseVarStd / i) + noiseStd * (baseVarStd / Math.sqrt(i)));
      let valIS = Math.max(0.00001, (baseVarIS / i) + noiseIS * (baseVarIS / Math.sqrt(i)));

      data.push({ n: i, stdVar: valStd, isVar: valIS });
    }
    return data;
  }, [sampleSize, seed]);

  const { width, height } = dimensions;
  const padding = { top: 20, right: 20, bottom: 40, left: 70 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const minX = chartData[0]?.n || 10;
  const maxX = sampleSize;
  const maxY = useMemo(() => {
    let max = 0;
    chartData.forEach(d => {
      if (d.stdVar > max) max = d.stdVar;
      if (showIS && d.isVar > max) max = d.isVar;
    });
    return max * 1.1;
  }, [chartData, showIS]);

  const scaleX = (n: number) => padding.left + ((n - minX) / (maxX - minX)) * innerWidth;
  const scaleY = (v: number) => padding.top + innerHeight - ((v / maxY) * innerHeight);

  const createPath = (key: 'stdVar' | 'isVar') => {
    if (chartData.length === 0) return '';
    return chartData.map((d, i) => {
      const x = scaleX(d.n);
      const y = scaleY(d[key]);
      return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
    }).join(' ');
  };

  const pathStd = createPath('stdVar');
  const pathIS = createPath('isVar');

  const handleReplay = () => {
    setIsReplaying(true);
    setSeed(prev => prev + Math.floor(Math.random() * 1000));
    setTimeout(() => setIsReplaying(false), 300);
  };

  const finalStdVar = chartData[chartData.length - 1]?.stdVar || 0;
  const finalISVar = chartData[chartData.length - 1]?.isVar || 0;
  const ciStd = 1.96 * Math.sqrt(finalStdVar);
  const ciIS = 1.96 * Math.sqrt(finalISVar);

  return (
    <div className="w-full h-full p-4 md:p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-slate-800/50 border-b border-slate-800 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-teal-400 animate-pulse"></span>
              Variance Decay Analysis
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Monte Carlo Estimator Lab • Convergence Module
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="bg-slate-900 px-3 py-1.5 rounded-md border border-slate-700 flex items-center gap-2">
              <span className="text-slate-500">SEED:</span>
              <span className="text-orange-400 font-bold">{seed.toString().padStart(6, '0')}</span>
            </div>
            <button 
              onClick={handleReplay}
              className={`bg-teal-950/50 hover:bg-teal-900/60 text-teal-400 border border-teal-800/50 px-4 py-1.5 rounded-md transition-all flex items-center gap-2 ${isReplaying ? 'scale-95 opacity-80' : ''}`}
            >
              <RefreshCw className={`w-4 h-4 ${isReplaying ? 'animate-spin' : ''}`} />
              REPLAY
            </button>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-900/50 p-5 rounded-xl border border-slate-800/50">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Sample Size (N)</label>
                <span className="text-lg font-bold text-teal-400">{sampleSize.toLocaleString()}</span>
              </div>
              <input 
                type="range" 
                min="100" 
                max="10000" 
                step="100" 
                value={sampleSize}
                onChange={(e) => setSampleSize(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>100</span>
                <span>10,000</span>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={showIS}
                    onChange={() => setShowIS(!showIS)}
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${showIS ? 'bg-orange-500/20 border border-orange-500/50' : 'bg-slate-800 border border-slate-700'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showIS ? 'translate-x-4 bg-orange-400' : 'bg-slate-400'}`}></div>
                </div>
                <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider group-hover:text-slate-200 transition-colors">
                  Importance Sampling (Control Variate)
                </span>
              </label>
            </div>
          </div>

          <div 
            ref={chartRef} 
            className="w-full h-[400px] bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

            <svg width="100%" height="100%" className="absolute inset-0 overflow-visible">
              <defs>
                <filter id="glow-teal" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="glow-orange" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                const y = padding.top + innerHeight * ratio;
                const val = maxY - (maxY * ratio);
                return (
                  <g key={`y-${ratio}`}>
                    <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                    <text x={padding.left - 10} y={y + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
                      {val.toExponential(1)}
                    </text>
                  </g>
                );
              })}

              {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                const x = padding.left + innerWidth * ratio;
                const val = minX + (maxX - minX) * ratio;
                return (
                  <g key={`x-${ratio}`}>
                    <line x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                    <text x={x} y={height - padding.bottom + 20} fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="monospace">
                      {Math.round(val)}
                    </text>
                  </g>
                );
              })}

              <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#334155" strokeWidth="2" />
              <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#334155" strokeWidth="2" />

              <text x={padding.left + innerWidth / 2} y={height - 5} fill="#94a3b8" fontSize="12" textAnchor="middle" fontWeight="bold">Sample Size (N)</text>
              <text x={-(padding.top + innerHeight / 2)} y={20} fill="#94a3b8" fontSize="12" textAnchor="middle" fontWeight="bold" transform="rotate(-90)">Empirical Variance (σ²)</text>

              <path 
                d={pathStd} 
                fill="none" 
                stroke="#2dd4bf" 
                strokeWidth="2.5" 
                strokeLinejoin="round"
                filter="url(#glow-teal)"
                className="transition-all duration-300"
              />
              
              {showIS && (
                <path 
                  d={pathIS} 
                  fill="none" 
                  stroke="#f97316" 
                  strokeWidth="2.5" 
                  strokeLinejoin="round"
                  filter="url(#glow-orange)"
                  className="transition-all duration-300"
                />
              )}
            </svg>
            
            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-slate-700 p-3 rounded-lg flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-teal-400 rounded-full shadow-[0_0_8px_#2dd4bf]"></div>
                <span className="text-xs text-slate-300">Standard MC</span>
              </div>
              {showIS && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-orange-500 rounded-full shadow-[0_0_8px_#f97316]"></div>
                  <span className="text-xs text-slate-300">Importance Sampling</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-teal-900/50 rounded-xl p-4 flex justify-between items-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div>
                <h3 className="text-teal-500 text-xs font-bold tracking-widest uppercase mb-1">Standard MC</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-light text-slate-100">{finalStdVar.toExponential(3)}</span>
                  <span className="text-xs text-slate-500">Var</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">95% Confidence Int.</div>
                <div className="bg-teal-950/40 text-teal-300 px-3 py-1 rounded-full text-sm font-mono border border-teal-800/50">
                  ± {ciStd.toFixed(4)}
                </div>
              </div>
            </div>

            <div className={`bg-slate-900 border rounded-xl p-4 flex justify-between items-center relative overflow-hidden transition-all ${showIS ? 'border-orange-900/50 opacity-100' : 'border-slate-800 opacity-40 grayscale pointer-events-none'}`}>
              <div className="absolute inset-0 bg-orange-500/5 opacity-0 hover:opacity-100 transition-opacity"></div>
              <div>
                <h3 className="text-orange-500 text-xs font-bold tracking-widest uppercase mb-1">Importance Sampling</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-light text-slate-100">{finalISVar.toExponential(3)}</span>
                  <span className="text-xs text-slate-500">Var</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">95% Confidence Int.</div>
                <div className="bg-orange-950/40 text-orange-300 px-3 py-1 rounded-full text-sm font-mono border border-orange-800/50">
                  ± {ciIS.toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Module 4: Importance Sampling Toggle ---
const TRUE_VALUE_M4 = 0.001349898;
const THRESHOLD_M4 = 3;

function Module4_ImportanceSampling() {
  const [sampleSize, setSampleSize] = useState<number>(1000);
  const [useIS, setUseIS] = useState<boolean>(true);
  const [seed, setSeed] = useState<number>(Date.now());
  const [isCalculating, setIsCalculating] = useState(false);

  const [results, setResults] = useState({
    estimate: 0, variance: 0, ciLower: 0, ciUpper: 0, history: [] as number[], error: 0
  });

  const runSimulation = useCallback(() => {
    setIsCalculating(true);
    setTimeout(() => {
      let sum = 0;
      let sumSq = 0;
      const history: number[] = [];
      const steps = 100;
      const stepSize = Math.max(1, Math.floor(sampleSize / steps));

      for (let i = 1; i <= sampleSize; i++) {
        let val = 0;
        if (useIS) {
          const x = randExp() + THRESHOLD_M4;
          val = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x + x - THRESHOLD_M4);
        } else {
          const x = boxMuller();
          val = x > THRESHOLD_M4 ? 1 : 0;
        }

        sum += val;
        sumSq += val * val;

        if (i % stepSize === 0 || i === sampleSize) {
          history.push(sum / i);
        }
      }

      const mean = sum / sampleSize;
      const variance = (sumSq / sampleSize) - (mean * mean);
      const standardError = Math.sqrt(Math.max(0, variance) / sampleSize);
      const zScore = 1.96;

      setResults({
        estimate: mean,
        variance: variance,
        ciLower: mean - zScore * standardError,
        ciUpper: mean + zScore * standardError,
        history: history,
        error: Math.abs(mean - TRUE_VALUE_M4) / TRUE_VALUE_M4
      });
      setIsCalculating(false);
    }, 0);
  }, [sampleSize, useIS, seed]);

  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  const handleReplay = () => setSeed(Date.now());

  const chartPoints = useMemo(() => {
    if (results.history.length === 0) return "";
    const minVal = Math.min(...results.history, TRUE_VALUE_M4 * 0.5);
    const maxVal = Math.max(...results.history, TRUE_VALUE_M4 * 2.0);
    const range = maxVal - minVal || 1;
    
    return results.history.map((val, i) => {
      const x = (i / (results.history.length - 1)) * 100;
      const y = 100 - ((val - minVal) / range) * 100;
      return `${x},${y}`;
    }).join(" ");
  }, [results.history]);

  const trueValueY = useMemo(() => {
    if (results.history.length === 0) return 50;
    const minVal = Math.min(...results.history, TRUE_VALUE_M4 * 0.5);
    const maxVal = Math.max(...results.history, TRUE_VALUE_M4 * 2.0);
    const range = maxVal - minVal || 1;
    return 100 - ((TRUE_VALUE_M4 - minVal) / range) * 100;
  }, [results.history]);

  return (
    <div className="w-full h-full p-6 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row">
        <div className="p-8 md:w-5/12 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/50 flex flex-col justify-between relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-orange-500 opacity-50"></div>
          <div>
            <div className="mb-2 uppercase tracking-widest text-xs font-bold text-slate-500">Module 04</div>
            <h2 className="text-2xl font-light text-white mb-6 tracking-tight">
              Variance <span className="font-semibold text-teal-400">Reduction</span>
            </h2>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Estimating tail probability <code className="text-orange-300 bg-slate-800 px-1 py-0.5 rounded">P(Z &gt; 3)</code>. 
              Standard MC wastes cycles on common events. Importance Sampling focuses on the tail, drastically reducing variance.
            </p>

            <div className="mb-8">
              <label className="text-xs uppercase tracking-wider text-slate-500 mb-3 block font-semibold">
                Sampling Strategy
              </label>
              <div 
                className="relative flex items-center p-1 bg-slate-950 rounded-lg cursor-pointer border border-slate-800"
                onClick={() => setUseIS(!useIS)}
              >
                <div className="flex-1 text-center z-10">
                  <span className={`text-sm font-medium transition-colors duration-300 ${!useIS ? 'text-white' : 'text-slate-500'}`}>
                    Standard MC
                  </span>
                </div>
                <div className="flex-1 text-center z-10">
                  <span className={`text-sm font-medium transition-colors duration-300 ${useIS ? 'text-slate-950' : 'text-slate-500'}`}>
                    Importance
                  </span>
                </div>
                <div 
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md transition-all duration-300 ease-in-out shadow-lg ${
                    useIS ? 'translate-x-[calc(100%+4px)] bg-teal-400 shadow-teal-500/20' : 'translate-x-0 bg-slate-700'
                  }`}
                />
              </div>
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-end mb-2">
                <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Sample Size (N)</label>
                <span className="font-mono text-teal-400">{sampleSize.toLocaleString()}</span>
              </div>
              <input 
                type="range" 
                min="100" 
                max="10000" 
                step="100"
                value={sampleSize}
                onChange={(e) => setSampleSize(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800/50">
             <div className="flex flex-col">
               <span className="text-[10px] uppercase text-slate-500">Random Seed</span>
               <span className="font-mono text-xs text-slate-400">{seed.toString().slice(-6)}</span>
             </div>
             <button 
                onClick={handleReplay}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs uppercase tracking-wider font-semibold rounded transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Replay
             </button>
          </div>
        </div>

        <div className="p-8 md:w-7/12 flex flex-col relative">
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-500 uppercase mb-1">Estimate</div>
              <div className={`font-mono text-xl ${useIS ? 'text-teal-400' : 'text-slate-200'}`}>
                {results.estimate.toExponential(4)}
              </div>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative overflow-hidden">
               <div className="absolute right-0 top-0 bottom-0 w-1 bg-orange-500/50"></div>
              <div className="text-xs text-slate-500 uppercase mb-1">True Value</div>
              <div className="font-mono text-xl text-orange-400">
                {TRUE_VALUE_M4.toExponential(4)}
              </div>
            </div>
          </div>

          <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-4 relative min-h-[200px] flex flex-col">
            <div className="flex justify-between items-center mb-4 z-10 relative">
              <span className="text-xs text-slate-500 uppercase tracking-widest">Convergence Chart</span>
              {isCalculating && <span className="text-xs text-teal-400 animate-pulse">Computing...</span>}
            </div>
            
            <div className="flex-1 relative w-full h-full">
              <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                <line 
                  x1="0" y1={trueValueY} x2="100" y2={trueValueY} 
                  stroke="#f97316" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-50"
                />
                <polyline 
                  points={chartPoints}
                  fill="none"
                  stroke={useIS ? "#2dd4bf" : "#94a3b8"}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div>
              <div className="text-[10px] text-slate-500 uppercase mb-1 flex items-center gap-2">
                Variance
                {useIS && <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[8px] border border-teal-500/30">Reduced</span>}
              </div>
              <div className="font-mono text-sm text-slate-300">
                {results.variance.toExponential(4)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase mb-1">95% Confidence Interval</div>
              <div className="font-mono text-sm text-slate-300 flex items-center gap-2">
                <span className="text-slate-500">[</span>
                {results.ciLower.toExponential(2)}
                <span className="text-slate-600">,</span>
                {results.ciUpper.toExponential(2)}
                <span className="text-slate-500">]</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Module 5: Confidence Interval Badge ---
const Z_SCORES: Record<number, number> = { 90: 1.645, 95: 1.960, 99: 2.576 };

interface ConfidenceBadgeProps {
  estimate: number;
  standardError: number;
  confidenceLevel: number;
  trueValue?: number;
}

const ConfidenceIntervalBadge: React.FC<ConfidenceBadgeProps> = ({
  estimate, standardError, confidenceLevel, trueValue,
}) => {
  const zScore = Z_SCORES[confidenceLevel];
  const marginOfError = zScore * standardError;
  const lowerBound = estimate - marginOfError;
  const upperBound = estimate + marginOfError;

  const containsTrueValue = trueValue !== undefined && trueValue >= lowerBound && trueValue <= upperBound;

  const padding = marginOfError * 1.5;
  const minScale = Math.min(trueValue ?? lowerBound, lowerBound) - padding;
  const maxScale = Math.max(trueValue ?? upperBound, upperBound) + padding;
  const range = maxScale - minScale;

  const toPct = (val: number) => Math.max(0, Math.min(100, ((val - minScale) / range) * 100));

  const leftPct = toPct(lowerBound);
  const widthPct = toPct(upperBound) - leftPct;
  const estPct = toPct(estimate);
  const truePct = trueValue !== undefined ? toPct(trueValue) : null;

  return (
    <div className="relative flex flex-col p-6 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-orange-500/5 opacity-50 pointer-events-none" />
      
      <div className="flex justify-between items-center mb-4 z-10">
        <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase">
          Confidence Interval Badge
        </h3>
        <span className="px-3 py-1 text-xs font-bold rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
          {confidenceLevel}% CI
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 z-10">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 mb-1">Lower Bound</span>
          <span className="text-lg font-mono text-slate-300">{lowerBound.toFixed(5)}</span>
        </div>
        <div className="flex flex-col items-center border-x border-slate-700/50 px-2">
          <span className="text-xs text-slate-500 mb-1">Mean Estimate (μ)</span>
          <span className="text-2xl font-mono font-bold text-teal-400">{estimate.toFixed(5)}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-500 mb-1">Upper Bound</span>
          <span className="text-lg font-mono text-slate-300">{upperBound.toFixed(5)}</span>
        </div>
      </div>

      <div className="flex justify-center items-center space-x-2 text-xs font-mono text-slate-400 mb-6 z-10 bg-slate-950/50 py-2 rounded-lg border border-slate-800/50">
        <span>μ ±</span>
        <span className="text-teal-500" title="Z-Score">Z({zScore})</span>
        <span>×</span>
        <span className="text-orange-400" title="Standard Error">SE({standardError.toFixed(5)})</span>
        <span>=</span>
        <span className="text-slate-200">±{marginOfError.toFixed(5)}</span>
      </div>

      <div className="relative h-12 w-full bg-slate-950 rounded-lg border border-slate-800 z-10 flex items-center px-2">
        <div className="absolute left-2 right-2 h-0.5 bg-slate-800 rounded-full" />
        <div 
          className={`absolute h-3 rounded-full transition-all duration-500 ease-out ${containsTrueValue ? 'bg-teal-500/40 border border-teal-500/80' : 'bg-orange-500/40 border border-orange-500/80'}`}
          style={{ left: `calc(0.5rem + ${leftPct}% * 0.95)`, width: `${widthPct}% * 0.95` }}
        />
        <div 
          className="absolute w-1.5 h-5 bg-teal-400 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.8)] transition-all duration-500 ease-out transform -translate-x-1/2"
          style={{ left: `calc(0.5rem + ${estPct}% * 0.95)` }}
        />
        {truePct !== null && (
          <div 
            className="absolute w-0.5 h-8 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] transition-all duration-500 ease-out transform -translate-x-1/2 z-20"
            style={{ left: `calc(0.5rem + ${truePct}% * 0.95)` }}
          >
            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-[10px] font-mono text-orange-400 whitespace-nowrap">
              True: {trueValue?.toFixed(4)}
            </div>
          </div>
        )}
      </div>

      {trueValue !== undefined && (
        <div className="mt-4 text-center z-10">
          {containsTrueValue ? (
            <span className="text-xs font-medium text-teal-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              True value captured within interval
            </span>
          ) : (
            <span className="text-xs font-medium text-orange-400 flex items-center justify-center gap-1">
              <ShieldAlert className="w-4 h-4" />
              True value fell outside interval (Expected {(100 - confidenceLevel).toFixed(0)}% of the time)
            </span>
          )}
        </div>
      )}
    </div>
  );
};

function Module5_ConfidenceInterval() {
  const [samples, setSamples] = useState<number>(1000);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(95);
  const [seed, setSeed] = useState<number>(Date.now());
  
  const [estimate, setEstimate] = useState<number>(0);
  const [se, setSe] = useState<number>(0);

  const TRUE_PI = Math.PI;
  const PI_VARIANCE = (TRUE_PI / 4) * (1 - TRUE_PI / 4) * 16;

  const runSimulation = useCallback(() => {
    const currentSe = Math.sqrt(PI_VARIANCE / samples);
    const noise = boxMuller();
    const currentEstimate = TRUE_PI + noise * currentSe;

    setSe(currentSe);
    setEstimate(currentEstimate);
  }, [samples, seed]);

  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-orange-400">
            Monte Carlo Estimator Lab
          </h1>
          <p className="text-slate-400 text-sm">
            Module Focus: <span className="text-teal-300 font-mono">Confidence Interval Badge</span>
          </p>
        </div>

        <ConfidenceIntervalBadge 
          estimate={estimate}
          standardError={se}
          confidenceLevel={confidenceLevel}
          trueValue={TRUE_PI}
        />

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Simulation Parameters</h2>
            <div className="text-xs font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">
              Seed: {seed.toString().slice(-6)}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <label className="text-slate-400">Sample Size (N)</label>
                <span className="font-mono text-teal-400">{samples.toLocaleString()}</span>
              </div>
              <input 
                type="range" 
                min="100" 
                max="100000" 
                step="100"
                value={samples}
                onChange={(e) => setSamples(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400">Confidence Level</label>
              <div className="flex space-x-2">
                {[90, 95, 99].map((level) => (
                  <button
                    key={level}
                    onClick={() => setConfidenceLevel(level)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200 border ${
                      confidenceLevel === level 
                        ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.2)]' 
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                    }`}
                  >
                    {level}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button 
            onClick={() => setSeed(Date.now())}
            className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white rounded-lg font-semibold shadow-lg shadow-teal-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Resample (Replay)
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Module 6: Reproducible Replay Button ---
type ExperimentTab = 'pi' | 'area' | 'option';

interface DataPoint {
  n: number;
  estimate: number;
  variance: number;
  lowerCI: number;
  upperCI: number;
  trueValue: number;
  ciRange: [number, number];
}

const EXPERIMENTS = {
  pi: { id: 'pi', name: 'Pi Estimation', trueValue: Math.PI },
  area: { id: 'area', name: 'Area Under Curve', trueValue: 0.88208 },
  option: { id: 'option', name: 'European Call Option', trueValue: 10.4506 }
};

function Module6_ReproducibleReplay() {
  const [activeTab, setActiveTab] = useState<ExperimentTab>('pi');
  const [seed, setSeed] = useState<number>(42);
  const [sampleSize, setSampleSize] = useState<number>(5000);
  const [useVarianceReduction, setUseVarianceReduction] = useState<boolean>(false);
  
  const [fullData, setFullData] = useState<DataPoint[]>([]);
  const [displayIndex, setDisplayIndex] = useState<number>(100);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

  const generateData = useCallback((tab: ExperimentTab, currentSeed: number, targetN: number, useVR: boolean) => {
    const prng = mulberry32(currentSeed);
    const data: DataPoint[] = [];
    const steps = 100;
    const chunkSize = Math.max(1, Math.floor(targetN / steps));

    let sum = 0;
    let sumSq = 0;
    let totalSamples = 0;

    for (let step = 1; step <= steps; step++) {
      let chunkSum = 0;
      let chunkSumSq = 0;

      for (let i = 0; i < chunkSize; i++) {
        let val = 0;
        
        if (tab === 'pi') {
          const x = prng();
          const y = prng();
          val = (x * x + y * y <= 1) ? 4 : 0;
          if (useVR) {
            const x2 = 1 - x;
            const y2 = 1 - y;
            const val2 = (x2 * x2 + y2 * y2 <= 1) ? 4 : 0;
            val = (val + val2) / 2;
          }
        } else if (tab === 'area') {
          const x = prng() * 2;
          val = 2 * Math.exp(-x * x);
          if (useVR) {
            const x2 = (1 - (x/2)) * 2;
            const val2 = 2 * Math.exp(-x2 * x2);
            val = (val + val2) / 2;
          }
        } else if (tab === 'option') {
          const z = boxMuller(prng);
          const S_T = 100 * Math.exp((0.05 - 0.5 * 0.04) * 1 + 0.2 * z);
          const payoff = Math.max(S_T - 100, 0) * Math.exp(-0.05);
          if (useVR) {
            const S_T_anti = 100 * Math.exp((0.05 - 0.5 * 0.04) * 1 + 0.2 * (-z));
            const payoff_anti = Math.max(S_T_anti - 100, 0) * Math.exp(-0.05);
            val = (payoff + payoff_anti) / 2;
          } else {
            val = payoff;
          }
        }
        
        chunkSum += val;
        chunkSumSq += val * val;
      }

      sum += chunkSum;
      sumSq += chunkSumSq;
      totalSamples += chunkSize;

      const mean = sum / totalSamples;
      const variance = (sumSq / totalSamples) - (mean * mean);
      const se = Math.sqrt(Math.max(0, variance) / totalSamples);
      const lowerCI = mean - 1.96 * se;
      const upperCI = mean + 1.96 * se;

      data.push({
        n: totalSamples, estimate: mean, variance, lowerCI, upperCI,
        trueValue: EXPERIMENTS[tab].trueValue, ciRange: [lowerCI, upperCI]
      });
    }
    return data;
  }, []);

  useEffect(() => {
    const newData = generateData(activeTab, seed, sampleSize, useVarianceReduction);
    setFullData(newData);
    setDisplayIndex(100);
    setIsReplaying(false);
  }, [activeTab, seed, sampleSize, useVarianceReduction, generateData]);

  useEffect(() => {
    if (isReplaying && displayIndex < 100) {
      const timer = setTimeout(() => setDisplayIndex(prev => prev + 1), 16);
      return () => clearTimeout(timer);
    } else if (displayIndex >= 100) {
      setIsReplaying(false);
    }
  }, [isReplaying, displayIndex]);

  const handleReplay = () => {
    if (isReplaying) return;
    setDisplayIndex(1);
    setIsReplaying(true);
  };

  const generateNewSeed = () => setSeed(Math.floor(Math.random() * 1000000));

  const displayedData = fullData.slice(0, displayIndex);
  const trueVal = EXPERIMENTS[activeTab].trueValue;

  return (
    <div className="w-full h-full p-6">
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Activity className="text-teal-400 w-8 h-8" />
            Monte Carlo Estimator Lab
          </h1>
          <p className="text-slate-500 mt-2 font-mono text-sm">
            [ Quant-Minded Frontend Edition // Deterministic Simulation Engine ]
          </p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
          {(Object.keys(EXPERIMENTS) as ExperimentTab[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === key ? 'bg-teal-500/10 text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              {EXPERIMENTS[key].name}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-teal-500 opacity-50"></div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Dna className="w-5 h-5 text-orange-400" />
              Simulation Engine
            </h2>
            <div className="space-y-5">
              <button
                onClick={handleReplay}
                disabled={isReplaying}
                className={`w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                  isReplaying 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                    : 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] hover:bg-orange-400 border border-orange-400'
                }`}
              >
                {isReplaying ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /> Replaying Simulation...</>
                ) : (
                  <><Play className="w-5 h-5 fill-current" /> Reproducible Replay</>
                )}
              </button>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Random Seed</label>
                  <span className="font-mono text-teal-400 text-lg">{seed}</span>
                </div>
                <button 
                  onClick={generateNewSeed}
                  disabled={isReplaying}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Clicking <strong className="text-orange-400/80">Reproducible Replay</strong> clears the chart and re-runs the exact same sequence of pseudo-random numbers, proving the deterministic nature of the seeded Monte Carlo simulation.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-teal-400" />
              Parameters
            </h2>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-400">Sample Size (N)</label>
                  <span className="font-mono text-teal-400">{sampleSize.toLocaleString()}</span>
                </div>
                <input 
                  type="range" min="100" max="50000" step="100"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(parseInt(e.target.value))}
                  disabled={isReplaying}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500 disabled:opacity-50"
                />
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div>
                  <label className="text-sm font-medium text-slate-300 block">Variance Reduction</label>
                  <span className="text-xs text-slate-500">Use Antithetic Variates</span>
                </div>
                <button
                  onClick={() => setUseVarianceReduction(!useVarianceReduction)}
                  disabled={isReplaying}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${useVarianceReduction ? 'bg-teal-500' : 'bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useVarianceReduction ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col min-h-[400px]">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Convergence Chart</h3>
          <div className="flex-1 w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={displayedData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="n" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                  itemStyle={{ color: '#2dd4bf' }}
                />
                <ReferenceLine y={trueVal} stroke="#f97316" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="ciRange" stroke="none" fill="#2dd4bf" fillOpacity={0.1} />
                <Line type="monotone" dataKey="estimate" stroke="#2dd4bf" strokeWidth={2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Main App Layout ---
const MODULES = [
  { id: 0, name: 'Random Seed Engine', icon: Dna },
  { id: 1, name: 'Sample Size Slider', icon: Settings2 },
  { id: 2, name: 'Variance Chart', icon: TrendingUp },
  { id: 3, name: 'Importance Sampling', icon: Zap },
  { id: 4, name: 'Confidence Interval', icon: ShieldCheck },
  { id: 5, name: 'Reproducible Replay', icon: Play },
];

export default function App() {
  const [activeModule, setActiveModule] = useState(0);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-teal-500/30">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-teal-500" />
            MC Lab
          </h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            const isActive = activeModule === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => setActiveModule(mod.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-teal-500/10 text-teal-400 shadow-[inset_0_0_0_1px_rgba(45,212,191,0.2)]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                {mod.name}
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto relative">
        {activeModule === 0 && <Module1_RandomSeed />}
        {activeModule === 1 && <Module2_SampleSize />}
        {activeModule === 2 && <Module3_VarianceChart />}
        {activeModule === 3 && <Module4_ImportanceSampling />}
        {activeModule === 4 && <Module5_ConfidenceInterval />}
        {activeModule === 5 && <Module6_ReproducibleReplay />}
      </main>
    </div>
  );
}