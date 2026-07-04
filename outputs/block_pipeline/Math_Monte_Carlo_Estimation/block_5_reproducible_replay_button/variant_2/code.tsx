import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Play, 
  RotateCcw, 
  Hash, 
  Activity, 
  ShieldCheck, 
  Settings2, 
  BarChart3, 
  RefreshCw,
  Info
} from 'lucide-react';

// --- PRNG & Math Helpers ---

// Mulberry32 PRNG (Seeded)
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Box-Muller Transform for Standard Normal Distribution
function randomNormal(rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

const generateRandomSeed = () => Math.floor(Math.random() * 2147483647);

// --- Simulation Engines ---

interface SimulationResult {
  step: number;
  estimate: number;
  variance: number;
  exact?: number;
}

// 1. Pi Estimation
function runPiSimulation(seed: number, n: number): SimulationResult[] {
  const rng = mulberry32(seed);
  let inside = 0;
  const results: SimulationResult[] = [];
  
  for (let i = 1; i <= n; i++) {
    const x = rng();
    const y = rng();
    if (x * x + y * y <= 1) inside++;
    
    const estimate = (inside / i) * 4;
    // Running variance of the Bernoulli variable (inside circle or not)
    const p = inside / i;
    const variance = (p * (1 - p)) / i; 
    
    results.push({ step: i, estimate, variance, exact: Math.PI });
  }
  return results;
}

// 2. Area Under Curve: e^(-x^2) from 0 to 2
function runAreaSimulation(seed: number, n: number, useImportanceSampling: boolean): SimulationResult[] {
  const rng = mulberry32(seed);
  const results: SimulationResult[] = [];
  let sum = 0;
  let sumSq = 0;
  
  // Exact integral is approx 0.88208
  const exact = 0.8820813907624216;

  for (let i = 1; i <= n; i++) {
    let value = 0;
    if (useImportanceSampling) {
      // Very naive importance sampling using an exponential envelope
      // Sample from exponential distribution lambda = 1 (truncated to 2, but simplified here)
      const u = rng();
      const x = -Math.log(1 - u * (1 - Math.exp(-2))); // Inverse transform for truncated exp
      const pdf = Math.exp(-x) / (1 - Math.exp(-2));
      value = Math.exp(-x * x) / pdf;
    } else {
      // Standard MC: Uniform(0,2)
      const x = rng() * 2;
      value = 2 * Math.exp(-x * x);
    }
    
    sum += value;
    sumSq += value * value;
    
    const estimate = sum / i;
    const meanSq = sumSq / i;
    const variance = (meanSq - estimate * estimate) / i;
    
    results.push({ step: i, estimate, variance, exact });
  }
  return results;
}

// 3. Option Pricing: European Call (Black-Scholes MC)
function runOptionSimulation(seed: number, n: number): SimulationResult[] {
  const rng = mulberry32(seed);
  const results: SimulationResult[] = [];
  
  const S0 = 100; // Spot
  const K = 100;  // Strike
  const T = 1;    // Time to maturity (years)
  const r = 0.05; // Risk-free rate
  const sigma = 0.2; // Volatility
  
  // Exact BS Price: approx 10.4506
  const exact = 10.450583572185565;
  
  let sum = 0;
  let sumSq = 0;
  
  const drift = (r - 0.5 * sigma * sigma) * T;
  const vol = sigma * Math.sqrt(T);
  const discount = Math.exp(-r * T);

  for (let i = 1; i <= n; i++) {
    const z = randomNormal(rng);
    const ST = S0 * Math.exp(drift + vol * z);
    const payoff = Math.max(0, ST - K) * discount;
    
    sum += payoff;
    sumSq += payoff * payoff;
    
    const estimate = sum / i;
    const meanSq = sumSq / i;
    const variance = (meanSq - estimate * estimate) / i;
    
    results.push({ step: i, estimate, variance, exact });
  }
  return results;
}


// --- Main Application ---

export default function App() {
  // State
  const [activeTab, setActiveTab] = useState<'pi' | 'area' | 'option'>('pi');
  const [seed, setSeed] = useState<number>(1337);
  const [sampleSize, setSampleSize] = useState<number>(500);
  const [importanceSampling, setImportanceSampling] = useState<boolean>(false);
  
  const [fullData, setFullData] = useState<SimulationResult[]>([]);
  const [displayData, setDisplayData] = useState<SimulationResult[]>([]);
  const [replayProgress, setReplayProgress] = useState<number>(0);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

  // Run Simulation (Full calc instantly)
  const calculateSimulation = useCallback((currentSeed: number) => {
    let data: SimulationResult[] = [];
    if (activeTab === 'pi') data = runPiSimulation(currentSeed, sampleSize);
    if (activeTab === 'area') data = runAreaSimulation(currentSeed, sampleSize, importanceSampling);
    if (activeTab === 'option') data = runOptionSimulation(currentSeed, sampleSize);
    
    setFullData(data);
    setDisplayData(data);
    setReplayProgress(sampleSize);
    setIsReplaying(false);
  }, [activeTab, sampleSize, importanceSampling]);

  // Initial Run & dependencies change
  useEffect(() => {
    calculateSimulation(seed);
  }, [activeTab, sampleSize, importanceSampling]); // Deliberately omitted seed to allow manual replay

  // Replay Animation Loop
  useEffect(() => {
    if (!isReplaying) return;
    
    let animationFrame: number;
    let lastTime = performance.now();
    const stepsPerMs = sampleSize / 2000; // Target 2 seconds for full replay
    
    const animate = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      
      setReplayProgress(prev => {
        const next = prev + Math.max(1, Math.floor(delta * stepsPerMs));
        if (next >= sampleSize) {
          setIsReplaying(false);
          return sampleSize;
        }
        return next;
      });
      animationFrame = requestAnimationFrame(animate);
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isReplaying, sampleSize]);

  // Sync display data with replay progress
  useEffect(() => {
    if (fullData.length > 0) {
      setDisplayData(fullData.slice(0, Math.max(1, replayProgress)));
    }
  }, [replayProgress, fullData]);

  // Actions
  const handleGenerateNewSeed = () => {
    const newSeed = generateRandomSeed();
    setSeed(newSeed);
    calculateSimulation(newSeed);
  };

  const handleReproducibleReplay = () => {
    // Recalculate just in case, but use the EXACT same seed
    const data = activeTab === 'pi' ? runPiSimulation(seed, sampleSize) :
                 activeTab === 'area' ? runAreaSimulation(seed, sampleSize, importanceSampling) :
                 runOptionSimulation(seed, sampleSize);
    setFullData(data);
    setReplayProgress(0);
    setIsReplaying(true);
  };

  const currentResult = displayData[displayData.length - 1];
  const exactValue = currentResult?.exact || 0;
  const estimate = currentResult?.estimate || 0;
  const variance = currentResult?.variance || 0;
  const standardError = Math.sqrt(variance);
  const ciLower = estimate - 1.96 * standardError;
  const ciUpper = estimate + 1.96 * standardError;
  const errorPct = Math.abs((estimate - exactValue) / exactValue) * 100;

  // Render SVG Chart
  const renderChart = () => {
    if (!displayData.length) return null;
    
    const width = 800;
    const height = 250;
    const padding = 20;
    
    const yMin = exactValue * 0.8;
    const yMax = exactValue * 1.2;
    const xMax = sampleSize;
    
    const scaleX = (x: number) => padding + (x / xMax) * (width - padding * 2);
    const scaleY = (y: number) => height - padding - ((y - yMin) / (yMax - yMin)) * (height - padding * 2);

    const points = displayData.map(d => `${scaleX(d.step)},${scaleY(d.estimate)}`).join(' ');
    
    return (
      <div className="relative w-full overflow-hidden bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-inner">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full text-xs font-mono" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1={padding} y1={scaleY(exactValue)} x2={width-padding} y2={scaleY(exactValue)} stroke="#f97316" strokeWidth="1" strokeDasharray="4 4" opacity="0.8" />
          <text x={width - padding + 5} y={scaleY(exactValue) + 4} fill="#f97316" fontSize="12">Exact</text>
          
          {/* CI Bands (approximate visual) */}
          {fullData.length > 0 && (
            <path 
              d={`M ${padding} ${scaleY(fullData[0].estimate)} ` + fullData.map(d => `L ${scaleX(d.step)} ${scaleY(d.estimate + 1.96*Math.sqrt(d.variance))}`).join(' ') + 
                 fullData.slice().reverse().map(d => `L ${scaleX(d.step)} ${scaleY(d.estimate - 1.96*Math.sqrt(d.variance))}`).join(' ') + ' Z'}
              fill="#14b8a6" 
              opacity="0.1"
            />
          )}

          {/* Estimate Line */}
          <polyline points={points} fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-6 selection:bg-teal-500/30">
      
      {/* Header */}
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 rounded-lg border border-teal-500/20">
            <Activity className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Monte Carlo Estimator Lab</h1>
            <p className="text-sm text-slate-500">Quant-minded stochastic simulations</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Controls & Configuration */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Tab Selection */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-2 flex flex-col gap-1">
            <button 
              onClick={() => setActiveTab('pi')}
              className={`px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'pi' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'hover:bg-slate-800 text-slate-400 border border-transparent'}`}
            >
              <div className="font-semibold">Pi Estimation</div>
              <div className="text-xs opacity-70">Unit circle dart throwing</div>
            </button>
            <button 
              onClick={() => setActiveTab('area')}
              className={`px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'area' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'hover:bg-slate-800 text-slate-400 border border-transparent'}`}
            >
              <div className="font-semibold">Area Under Curve</div>
              <div className="text-xs opacity-70">Integral of e^(-x²) on [0,2]</div>
            </button>
            <button 
              onClick={() => setActiveTab('option')}
              className={`px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'option' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'hover:bg-slate-800 text-slate-400 border border-transparent'}`}
            >
              <div className="font-semibold">Option Pricing Toy</div>
              <div className="text-xs opacity-70">European Call (Black-Scholes)</div>
            </button>
          </div>

          {/* Parameters */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-semibold text-white tracking-wider uppercase">Parameters</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <label className="text-slate-400">Sample Size (N)</label>
                  <span className="text-teal-400 font-mono">{sampleSize}</span>
                </div>
                <input 
                  type="range" 
                  min="100" 
                  max="5000" 
                  step="100"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Number(e.target.value))}
                  className="w-full accent-teal-500 bg-slate-800 rounded-lg appearance-none h-2"
                  disabled={isReplaying}
                />
              </div>

              {activeTab === 'area' && (
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-200">Importance Sampling</div>
                    <div className="text-xs text-slate-500">Use exponential envelope</div>
                  </div>
                  <button 
                    onClick={() => setImportanceSampling(!importanceSampling)}
                    disabled={isReplaying}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${importanceSampling ? 'bg-teal-500' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${importanceSampling ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Core Feature: Reproducible Replay Box */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-xl border-2 border-orange-500/20 p-5 shadow-[0_0_30px_-10px_rgba(249,115,22,0.1)] relative overflow-hidden">
            {isReplaying && (
              <div className="absolute top-0 left-0 h-1 bg-orange-500/50 transition-all duration-75" style={{ width: `${(replayProgress/sampleSize)*100}%` }} />
            )}
            
            <div className="flex items-center gap-2 mb-4">
              <RotateCcw className={`w-5 h-5 ${isReplaying ? 'text-orange-400 animate-spin-slow' : 'text-orange-500'}`} />
              <h2 className="text-sm font-bold text-white tracking-wider uppercase">Reproducibility Engine</h2>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex justify-between items-center group">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-400">PRNG Seed</span>
                </div>
                <div className="font-mono text-teal-400 text-sm">{seed}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleGenerateNewSeed}
                  disabled={isReplaying}
                  className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  New Seed
                </button>
                <button
                  onClick={handleReproducibleReplay}
                  disabled={isReplaying}
                  className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium py-2.5 rounded-lg transition-all shadow-[0_0_15px_-3px_rgba(249,115,22,0.4)] disabled:opacity-50 disabled:shadow-none"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {isReplaying ? 'Replaying...' : 'Replay Path'}
                </button>
              </div>
              
              <div className="text-xs text-slate-500 leading-relaxed flex items-start gap-2 bg-orange-500/5 p-2 rounded-md border border-orange-500/10">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-orange-400/70" />
                <span>Replay uses the exact same pseudo-random sequence to guarantee identical intermediate variance and final convergence.</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Visualization & Results */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="text-sm text-slate-400 mb-1">Current Estimate</div>
              <div className="text-3xl font-bold text-white font-mono">
                {estimate.toFixed(5)}
              </div>
              <div className={`text-xs mt-2 flex items-center gap-1 ${errorPct < 1 ? 'text-teal-400' : 'text-orange-400'}`}>
                <span>Err: {errorPct.toFixed(3)}%</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="text-sm text-slate-400 mb-1">Exact Value</div>
              <div className="text-3xl font-bold text-slate-300 font-mono">
                {exactValue.toFixed(5)}
              </div>
              <div className="text-xs mt-2 text-slate-500 font-mono">
                Theoretical analytical limit
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-5">
                <ShieldCheck className="w-32 h-32" />
              </div>
              <div className="text-sm text-slate-400 mb-1">95% Confidence Interval</div>
              <div className="text-xl font-bold text-teal-400 font-mono mt-2">
                [{ciLower.toFixed(4)}, {ciUpper.toFixed(4)}]
              </div>
              <div className="inline-flex items-center gap-1.5 mt-3 px-2 py-1 bg-teal-500/10 border border-teal-500/20 rounded text-xs text-teal-400">
                <ShieldCheck className="w-3 h-3" />
                Badge of Convergence
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-400" />
                <h3 className="text-lg font-semibold text-white">Convergence