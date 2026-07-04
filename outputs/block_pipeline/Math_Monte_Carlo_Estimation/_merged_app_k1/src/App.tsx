import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceLine, Area, ComposedChart 
} from 'recharts';
import { 
  Play, RefreshCw, Settings2, Activity, ShieldAlert, Zap, 
  ShieldCheck, Hash, Dna, Calculator, TrendingUp, CheckCircle2, XCircle
} from 'lucide-react';

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

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function boxMuller(prng: () => number = Math.random) {
  let u = 0, v = 0;
  while(u === 0) u = prng();
  while(v === 0) v = prng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

const generateRandomSeedString = () => {
  return Math.random().toString(16).substring(2, 10).toUpperCase();
};

const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);
const formatDecimals = (num: number, dec: number = 5) => num.toFixed(dec);

// --- Module 1: Random Seed Display ---
function Module1_SeedEngine() {
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
    <div className="p-6 flex flex-col items-center justify-center min-h-full">
      <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-slate-900 border-b border-slate-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-teal-500/20 flex items-center justify-center border border-teal-500/50">
              <Dna className="w-5 h-5 text-teal-400" />
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

  const sliderProgress = ((sliderValue - 1) / (6 - 1)) * 100;

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200 flex items-center gap-3">
            <Settings2 className="w-8 h-8 text-teal-500" />
            Sample Size Controller
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
              <p className="text-slate-400 text-sm mt-1">Adjust the number of Monte Carlo iterations ($N$)</p>
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
              type="range" min="1" max="6" step="0.01"
              value={sliderValue}
              onChange={(e) => setSliderValue(parseFloat(e.target.value))}
              className="w-full absolute top-1/2 -translate-y-1/2 left-0 h-3 opacity-0 cursor-pointer z-20"
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
                  type="checkbox" className="sr-only"
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
          <div className="text-3xl font-mono text-white mb-4">{formatDecimals(simulationResult.estimate, 6)}</div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">True π:</span>
            <span className="font-mono text-slate-400">3.141592...</span>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div className="text-slate-400 text-sm font-medium mb-2">Absolute Error</div>
          <div className="text-3xl font-mono text-orange-400 mb-4">{formatDecimals(simulationResult.error, 6)}</div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-1 overflow-hidden">
            <div 
              className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((simulationResult.error / 0.1) * 100, 100)}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 font-mono">Var: {simulationResult.variance.toExponential(2)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-slate-800/50"><ShieldAlert className="w-24 h-24" /></div>
          <div className="relative z-10">
            <div className="text-slate-400 text-sm font-medium mb-2">95% Confidence Interval</div>
            <div className="bg-slate-950 border border-teal-500/30 rounded-lg p-3 inline-block mb-2">
              <div className="text-sm font-mono text-teal-300">
                [{formatDecimals(simulationResult.ciLower, 4)}, {formatDecimals(simulationResult.ciUpper, 4)}]
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-2">Width: {formatDecimals(simulationResult.ciUpper - simulationResult.ciLower, 5)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Module 3: Variance Chart ---
function Module3_VarianceChart() {
  const [sampleSize, setSampleSize] = useState<number>(5000);
  const [seed, setSeed] = useState<number>(1337);
  const [useIS, setUseIS] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const chartData = useMemo(() => {
    const random = mulberry32(seed);
    const data = [];
    let sumStd = 0, sumSqStd = 0, sumIS = 0, sumSqIS = 0;
    const steps = 100;
    const stepSize = Math.max(1, Math.floor(sampleSize / steps));

    for (let i = 1; i <= sampleSize; i++) {
      const u = random();
      const xStd = u;
      const yStd = Math.exp(-(xStd * xStd));
      sumStd += yStd;
      sumSqStd += yStd * yStd;

      const xIS = 1 - Math.sqrt(1 - u);
      const pX = Math.max(2 * (1 - xIS), 0.0001); 
      const yIS = Math.exp(-(xIS * xIS)) / pX;
      sumIS += yIS;
      sumSqIS += yIS * yIS;

      if (i % stepSize === 0 || i === sampleSize) {
        const meanStd = sumStd / i;
        const varStd = (sumSqStd / i - meanStd * meanStd) / i;
        const meanIS = sumIS / i;
        const varIS = (sumSqIS / i - meanIS * meanIS) / i;
        data.push({
          n: i,
          stdVariance: Math.max(varStd, 1e-9),
          isVariance: Math.max(varIS, 1e-9),
          stdEstimate: meanStd,
          isEstimate: meanIS,
        });
      }
    }
    return data;
  }, [sampleSize, seed]);

  const handleReplay = useCallback(() => {
    setIsSimulating(true);
    setSeed(Math.floor(Math.random() * 1000000));
    setTimeout(() => setIsSimulating(false), 300);
  }, []);

  const latestData = chartData[chartData.length - 1];
  const currentVariance = useIS ? latestData.isVariance : latestData.stdVariance;
  const currentEstimate = useIS ? latestData.isEstimate : latestData.stdEstimate;
  const standardError = Math.sqrt(currentVariance);
  const ciLower = currentEstimate - 1.96 * standardError;
  const ciUpper = currentEstimate + 1.96 * standardError;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-6 h-6 text-teal-400" />
            Variance Convergence Chart
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Monte Carlo Estimation: Area under <code className="text-orange-300 bg-orange-950/30 px-1.5 py-0.5 rounded">f(x) = e^(-x²)</code>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-md">
            <Hash className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-mono text-slate-300">Seed: {seed}</span>
          </div>
          <button
            onClick={handleReplay}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2 rounded-md font-semibold transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
            Replay
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-orange-400" />
              Parameters
            </h2>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-slate-400">Sample Size (N)</label>
                  <span className="text-sm font-mono text-teal-400">{sampleSize.toLocaleString()}</span>
                </div>
                <input
                  type="range" min="100" max="50000" step="100"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              </div>
              <div className="pt-4 border-t border-slate-800">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">
                    Importance Sampling
                  </span>
                  <div className="relative">
                    <input 
                      type="checkbox" className="sr-only" 
                      checked={useIS} onChange={(e) => setUseIS(e.target.checked)}
                    />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${useIS ? 'bg-teal-500' : 'bg-slate-700'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${useIS ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </div>
                </label>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Toggles variance reduction. Compares standard uniform sampling vs sampling from a linear decay distribution.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-bl-full -z-0"></div>
            <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2 relative z-10">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              Live Metrics
            </h2>
            <div className="space-y-4 relative z-10">
              <div>
                <div className="text-xs text-slate-500 mb-1">Final Estimate</div>
                <div className="text-2xl font-mono text-slate-100">{currentEstimate.toFixed(6)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">95% Confidence Interval</div>
                <div className="inline-flex items-center gap-2 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded text-sm font-mono text-teal-300">
                  <span>{ciLower.toFixed(5)}</span>
                  <span className="text-slate-600">,</span>
                  <span>{ciUpper.toFixed(5)}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Variance of Mean (Var/N)</div>
                <div className="text-sm font-mono text-orange-400">{currentVariance.toExponential(4)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col min-h-[500px]">
          <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider mb-6">
            Variance Convergence (Log Scale)
          </h2>
          <div className="flex-1 w-full h-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="n" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : val}
                  label={{ value: 'Sample Size (N)', position: 'insideBottom', offset: -15, fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis 
                  scale="log" domain={['auto', 'auto']} stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(val) => val.toExponential(1)}
                  label={{ value: 'Variance', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ fontFamily: 'monospace', fontSize: '13px' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '12px' }}
                  formatter={(value: number, name: string) => [
                    value.toExponential(4), name === 'stdVariance' ? 'Standard MC' : 'Importance Sampling'
                  ]}
                  labelFormatter={(label) => `N = ${label}`}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', color: '#cbd5e1' }} />
                <Line 
                  type="monotone" dataKey="stdVariance" name="Standard MC" stroke="#f97316" 
                  strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#f97316', stroke: '#0f172a', strokeWidth: 2 }}
                  opacity={useIS ? 0.4 : 1}
                />
                {useIS && (
                  <Line 
                    type="monotone" dataKey="isVariance" name="Importance Sampling" stroke="#14b8a6" 
                    strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#14b8a6', stroke: '#0f172a', strokeWidth: 2 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Module 4: Importance Sampling Toggle ---
function Module4_ImportanceSampling() {
  const [seed, setSeed] = useState<number>(1337);
  const [sampleSize, setSampleSize] = useState<number>(5000);
  const [useIS, setUseIS] = useState<boolean>(true);

  const S0 = 100, K = 140, T = 1, r = 0.05, sigma = 0.2, EXACT_PRICE = 0.791, mu_IS = 1.53;

  const simulationData = useMemo(() => {
    const rng = mulberry32(seed);
    const steps = 100;
    const stepSize = Math.max(1, Math.floor(sampleSize / steps));
    let sum = 0, sumSq = 0;
    const history = [];

    for (let i = 1; i <= sampleSize; i++) {
      const Z = boxMuller(rng);
      let payoff = 0;

      if (useIS) {
        const Z_IS = Z + mu_IS;
        const ST = S0 * Math.exp((r - 0.5 * sigma * sigma) * T + sigma * Math.sqrt(T) * Z_IS);
        const rawPayoff = Math.max(ST - K, 0) * Math.exp(-r * T);
        const LR = Math.exp(-mu_IS * Z_IS + 0.5 * mu_IS * mu_IS);
        payoff = rawPayoff * LR;
      } else {
        const ST = S0 * Math.exp((r - 0.5 * sigma * sigma) * T + sigma * Math.sqrt(T) * Z);
        payoff = Math.max(ST - K, 0) * Math.exp(-r * T);
      }

      sum += payoff;
      sumSq += payoff * payoff;

      if (i % stepSize === 0 || i === sampleSize) {
        const mean = sum / i;
        const variance = (sumSq / i) - (mean * mean);
        const standardError = Math.sqrt(Math.max(0, variance) / i);
        history.push({ step: i, mean, standardError, variance });
      }
    }
    return { history, finalResult: history[history.length - 1] };
  }, [seed, sampleSize, useIS]);

  const { history, finalResult } = simulationData;
  const ciLower = Math.max(0, finalResult.mean - 1.96 * finalResult.standardError);
  const ciUpper = finalResult.mean + 1.96 * finalResult.standardError;

  const handleReplay = useCallback(() => setSeed(Math.floor(Math.random() * 1000000)), []);

  const chartWidth = 800, chartHeight = 240, padding = 20;
  const maxMean = Math.max(...history.map(d => d.mean), EXACT_PRICE * 1.5);
  const minMean = 0;
  const getX = (step: number) => padding + ((step / sampleSize) * (chartWidth - padding * 2));
  const getY = (val: number) => chartHeight - padding - ((val - minMean) / (maxMean - minMean || 1)) * (chartHeight - padding * 2);
  const pathData = history.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.step)} ${getY(d.mean)}`).join(' ');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-8 h-8 text-teal-400" />
            Deep OOTM Call Option
          </h2>
          <p className="text-slate-400 mt-1 max-w-2xl">
            Estimating the price of a rare-event payoff. Notice how standard Monte Carlo suffers from high variance (jumpy estimates), while Importance Sampling smooths convergence.
          </p>
        </div>
        <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 rounded-lg p-2 shadow-sm">
          <div className="px-3 py-1 bg-slate-950 rounded text-sm font-mono text-slate-400 border border-slate-800">
            Seed: <span className="text-teal-400">{seed}</span>
          </div>
          <button 
            onClick={handleReplay}
            className="p-2 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className={`relative overflow-hidden rounded-xl border transition-all duration-500 ${
            useIS ? 'bg-teal-950/20 border-teal-500/30 shadow-[0_0_30px_-10px_rgba(20,184,166,0.15)]' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Zap className={`w-5 h-5 ${useIS ? 'text-teal-400' : 'text-slate-500'}`} />
                  <h3 className="text-lg font-semibold text-slate-100">Importance Sampling</h3>
                </div>
                <button
                  onClick={() => setUseIS(!useIS)}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                    useIS ? 'bg-teal-500' : 'bg-slate-700'
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ease-in-out ${useIS ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                {useIS 
                  ? "Active. We shift the drift of the underlying asset to force more paths into the money, then adjust the payoff by the likelihood ratio."
                  : "Inactive. Standard Monte Carlo simulates the true physical/risk-neutral measure. Rare events are easily missed."}
              </p>
              <div className={`flex items-center justify-center space-x-2 text-xs font-medium px-3 py-2 rounded-lg border ${
                useIS ? 'bg-teal-900/30 border-teal-800/50 text-teal-300' : 'bg-orange-900/20 border-orange-800/50 text-orange-400'
              }`}>
                {useIS ? 'Variance Reduced' : 'High Variance'}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
             <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider mb-4">Results</h3>
             <div className="space-y-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Final Estimate</div>
                  <div className="text-2xl font-mono text-slate-100">{finalResult.mean.toFixed(6)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">95% Confidence Interval</div>
                  <div className="text-sm font-mono text-teal-300">[{ciLower.toFixed(5)}, {ciUpper.toFixed(5)}]</div>
                </div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col min-h-[300px]">
           <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider mb-4">Convergence Path</h3>
           <div className="flex-1 w-full relative">
             <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible" preserveAspectRatio="none">
                <line x1={padding} y1={getY(EXACT_PRICE)} x2={chartWidth - padding} y2={getY(EXACT_PRICE)} stroke="#94a3b8" strokeDasharray="4 4" />
                <polyline points={pathData} fill="none" stroke={useIS ? "#14b8a6" : "#f97316"} strokeWidth="2" />
             </svg>
           </div>
        </div>
      </div>
    </div>
  );
}

// --- Module 5: Confidence Interval Badge ---
const Z_SCORES: Record<number, number> = { 90: 1.645, 95: 1.960, 99: 2.576 };

function Module5_ConfidenceBadge() {
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

  useEffect(() => { runSimulation(); }, [runSimulation]);

  const zScore = Z_SCORES[confidenceLevel];
  const marginOfError = zScore * se;
  const lowerBound = estimate - marginOfError;
  const upperBound = estimate + marginOfError;
  const containsTrueValue = TRUE_PI >= lowerBound && TRUE_PI <= upperBound;

  const padding = marginOfError * 1.5;
  const minScale = Math.min(TRUE_PI, lowerBound) - padding;
  const maxScale = Math.max(TRUE_PI, upperBound) + padding;
  const range = maxScale - minScale;
  const toPct = (val: number) => Math.max(0, Math.min(100, ((val - minScale) / range) * 100));

  const leftPct = toPct(lowerBound);
  const widthPct = toPct(upperBound) - leftPct;
  const estPct = toPct(estimate);
  const truePct = toPct(TRUE_PI);

  return (
    <div className="p-6 flex items-center justify-center min-h-full">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-orange-400">
            Confidence Interval Badge
          </h1>
          <p className="text-slate-400 text-sm">
            Visualizing statistical bounds around Monte Carlo estimates.
          </p>
        </div>

        <div className="relative flex flex-col p-6 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-orange-500/5 opacity-50 pointer-events-none" />
          <div className="flex justify-between items-center mb-4 z-10">
            <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase">Confidence Interval Badge</h3>
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
            <span className="text-orange-400" title="Standard Error">SE({se.toFixed(5)})</span>
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
            <div 
              className="absolute w-0.5 h-8 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] transition-all duration-500 ease-out transform -translate-x-1/2 z-20"
              style={{ left: `calc(0.5rem + ${truePct}% * 0.95)` }}
            >
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-[10px] font-mono text-orange-400 whitespace-nowrap">
                True: {TRUE_PI.toFixed(4)}
              </div>
            </div>
          </div>

          <div className="mt-4 text-center z-10">
            {containsTrueValue ? (
              <span className="text-xs font-medium text-teal-400 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> True value captured within interval
              </span>
            ) : (
              <span className="text-xs font-medium text-orange-400 flex items-center justify-center gap-1">
                <XCircle className="w-4 h-4" /> True value fell outside interval (Expected {(100 - confidenceLevel).toFixed(0)}% of the time)
              </span>
            )}
          </div>
        </div>

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
                type="range" min="100" max="100000" step="100"
                value={samples} onChange={(e) => setSamples(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Confidence Level</label>
              <div className="flex space-x-2">
                {[90, 95, 99].map((level) => (
                  <button
                    key={level} onClick={() => setConfidenceLevel(level)}
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
            <RefreshCw className="w-5 h-5" /> Resample (Replay)
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Module 6: Reproducible Replay Button ---
type ExperimentTab = 'pi' | 'area' | 'option';
interface DataPoint {
  n: number; estimate: number; variance: number; lowerCI: number; upperCI: number; trueValue: number; ciRange: [number, number];
}
const EXPERIMENTS = {
  pi: { id: 'pi', name: 'Pi Estimation', trueValue: Math.PI, desc: 'Estimate π by dropping points in a 1x1 square.' },
  area: { id: 'area', name: 'Area Under Curve', trueValue: 0.88208, desc: 'Estimate the integral of f(x) = e^(-x^2) from x=0 to x=2.' },
  option: { id: 'option', name: 'European Call Option', trueValue: 10.4506, desc: 'Price a European Call Option using Black-Scholes dynamics.' }
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
    let sum = 0, sumSq = 0, totalSamples = 0;

    for (let step = 1; step <= steps; step++) {
      let chunkSum = 0, chunkSumSq = 0;
      for (let i = 0; i < chunkSize; i++) {
        let val = 0;
        if (tab === 'pi') {
          const x = prng(), y = prng();
          val = (x * x + y * y <= 1) ? 4 : 0;
          if (useVR) {
            const x2 = 1 - x, y2 = 1 - y;
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
      data.push({ n: totalSamples, estimate: mean, variance, lowerCI, upperCI, trueValue: EXPERIMENTS[tab].trueValue, ciRange: [lowerCI, upperCI] });
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

  const displayedData = fullData.slice(0, displayIndex);
  const trueVal = EXPERIMENTS[activeTab].trueValue;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Play className="text-teal-400 w-8 h-8" />
            Reproducible Replay
          </h1>
          <p className="text-slate-500 mt-2 font-mono text-sm">
            [ Quant-Minded Frontend Edition // Deterministic Simulation Engine ]
          </p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
          {(Object.keys(EXPERIMENTS) as ExperimentTab[]).map((key) => (
            <button
              key={key} onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === key ? 'bg-teal-500/10 text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              {EXPERIMENTS[key].name}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-teal-500 opacity-50"></div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Dna className="w-5 h-5 text-orange-400" /> Simulation Engine
            </h2>
            <div className="space-y-5">
              <button
                onClick={handleReplay} disabled={isReplaying}
                className={`w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                  isReplaying 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                    : 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] hover:bg-orange-400 border border-orange-400'
                }`}
              >
                {isReplaying ? <><RefreshCw className="w-5 h-5 animate-spin" /> Replaying Simulation...</> : <><Play className="w-5 h-5 fill-current" /> Reproducible Replay</>}
              </button>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Random Seed</label>
                  <span className="font-mono text-teal-400 text-lg">{seed}</span>
                </div>
                <button 
                  onClick={() => setSeed(Math.floor(Math.random() * 1000000))} disabled={isReplaying}
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
              <Settings2 className="w-5 h-5 text-teal-400" /> Parameters
            </h2>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-400">Sample Size (N)</label>
                  <span className="font-mono text-teal-400">{sampleSize.toLocaleString()}</span>
                </div>
                <input 
                  type="range" min="100" max="50000" step="100"
                  value={sampleSize} onChange={(e) => setSampleSize(parseInt(e.target.value))} disabled={isReplaying}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500 disabled:opacity-50"
                />
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div>
                  <label className="text-sm font-medium text-slate-300 block">Variance Reduction</label>
                  <span className="text-xs text-slate-500">Use Antithetic Variates</span>
                </div>
                <button
                  onClick={() => setUseVarianceReduction(!useVarianceReduction)} disabled={isReplaying}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                    useVarianceReduction ? 'bg-teal-500' : 'bg-slate-700'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useVarianceReduction ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-6 min-h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={displayedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="n" stroke="#94a3b8" />
              <YAxis domain={['auto', 'auto']} stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
              <Area type="monotone" dataKey="ciRange" stroke="none" fill="#14b8a6" fillOpacity={0.1} />
              <Line type="monotone" dataKey="estimate" stroke="#f97316" strokeWidth={2} dot={false} />
              <ReferenceLine y={trueVal} stroke="#94a3b8" strokeDasharray="3 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// --- Main App Shell ---
const MODULES = [
  { id: 'seed', name: '1. Random Seed Engine', icon: Dna },
  { id: 'slider', name: '2. Sample Size Slider', icon: Settings2 },
  { id: 'variance', name: '3. Variance Chart', icon: Activity },
  { id: 'is', name: '4. Importance Sampling', icon: Zap },
  { id: 'ci', name: '5. Confidence Interval', icon: ShieldCheck },
  { id: 'replay', name: '6. Reproducible Replay', icon: Play },
];

export default function App() {
  const [activeModule, setActiveModule] = useState('seed');

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 font-sans overflow-hidden selection:bg-teal-500/30">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-xl">
        <div className="p-5 border-b border-slate-800">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-teal-500" />
            MC Lab
          </h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {MODULES.map(m => (
            <button 
              key={m.id} 
              onClick={() => setActiveModule(m.id)} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeModule === m.id 
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
              }`}
            >
              <m.icon className={`w-4 h-4 ${activeModule === m.id ? 'text-teal-400' : 'text-slate-500'}`} />
              {m.name}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto relative bg-slate-950">
        {activeModule === 'seed' && <Module1_SeedEngine />}
        {activeModule === 'slider' && <Module2_SampleSize />}
        {activeModule === 'variance' && <Module3_VarianceChart />}
        {activeModule === 'is' && <Module4_ImportanceSampling />}
        {activeModule === 'ci' && <Module5_ConfidenceBadge />}
        {activeModule === 'replay' && <Module6_ReproducibleReplay />}
      </main>
    </div>
  );
}