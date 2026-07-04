import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Area, 
  ComposedChart,
  ReferenceLine
} from 'recharts';
import { 
  Play, 
  RefreshCw, 
  Settings2, 
  Dna, 
  Activity, 
  Calculator, 
  TrendingUp,
  ShieldCheck
} from 'lucide-react';

// --- PRNG & Math Utilities ---

// Mulberry32 PRNG for reproducible random numbers
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Box-Muller transform for standard normal distribution
function boxMuller(prng: () => number) {
  let u = 0, v = 0;
  while(u === 0) u = prng();
  while(v === 0) v = prng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// --- Types & Constants ---

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
  pi: {
    id: 'pi',
    name: 'Pi Estimation',
    trueValue: Math.PI,
    desc: 'Estimate π by dropping points in a 1x1 square and checking if they fall inside a quarter circle.'
  },
  area: {
    id: 'area',
    name: 'Area Under Curve',
    trueValue: 0.88208, // Integral of e^(-x^2) from 0 to 2
    desc: 'Estimate the integral of f(x) = e^(-x^2) from x=0 to x=2.'
  },
  option: {
    id: 'option',
    name: 'European Call Option',
    trueValue: 10.4506, // Black-Scholes price for S=100, K=100, r=0.05, v=0.2, T=1
    desc: 'Price a European Call Option using Black-Scholes dynamics.'
  }
};

// --- Main Component ---

export default function App() {
  // State
  const [activeTab, setActiveTab] = useState<ExperimentTab>('pi');
  const [seed, setSeed] = useState<number>(42);
  const [sampleSize, setSampleSize] = useState<number>(5000);
  const [useVarianceReduction, setUseVarianceReduction] = useState<boolean>(false);
  
  const [fullData, setFullData] = useState<DataPoint[]>([]);
  const [displayIndex, setDisplayIndex] = useState<number>(100);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

  // Generate Data
  const generateData = useCallback((
    tab: ExperimentTab, 
    currentSeed: number, 
    targetN: number, 
    useVR: boolean
  ) => {
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
            // Antithetic variates for Pi (using 1-x, 1-y)
            const x2 = 1 - x;
            const y2 = 1 - y;
            const val2 = (x2 * x2 + y2 * y2 <= 1) ? 4 : 0;
            val = (val + val2) / 2;
          }
        } 
        else if (tab === 'area') {
          const x = prng() * 2;
          val = 2 * Math.exp(-x * x);
          
          if (useVR) {
            // Antithetic variates for Area
            const x2 = (1 - (x/2)) * 2;
            const val2 = 2 * Math.exp(-x2 * x2);
            val = (val + val2) / 2;
          }
        } 
        else if (tab === 'option') {
          const z = boxMuller(prng);
          const S_T = 100 * Math.exp((0.05 - 0.5 * 0.04) * 1 + 0.2 * z);
          const payoff = Math.max(S_T - 100, 0) * Math.exp(-0.05);

          if (useVR) {
            // Antithetic variates for Option Pricing (-z)
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
        n: totalSamples,
        estimate: mean,
        variance: variance,
        lowerCI,
        upperCI,
        trueValue: EXPERIMENTS[tab].trueValue,
        ciRange: [lowerCI, upperCI]
      });
    }
    return data;
  }, []);

  // Recalculate data when parameters change
  useEffect(() => {
    const newData = generateData(activeTab, seed, sampleSize, useVarianceReduction);
    setFullData(newData);
    setDisplayIndex(100); // Instantly show full data on param change
    setIsReplaying(false);
  }, [activeTab, seed, sampleSize, useVarianceReduction, generateData]);

  // Replay Animation Logic
  useEffect(() => {
    if (isReplaying && displayIndex < 100) {
      const timer = setTimeout(() => {
        setDisplayIndex(prev => prev + 1);
      }, 16); // ~60fps
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

  const generateNewSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000));
  };

  const displayedData = fullData.slice(0, displayIndex);
  const currentStats = displayedData[displayedData.length - 1] || null;
  const trueVal = EXPERIMENTS[activeTab].trueValue;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-6 selection:bg-teal-500/30">
      
      {/* Header */}
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
        
        {/* Tabs */}
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
          {(Object.keys(EXPERIMENTS) as ExperimentTab[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === key 
                  ? 'bg-teal-500/10 text-teal-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              {EXPERIMENTS[key].name}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Replay & Seed Card (The Focus Feature) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-teal-500 opacity-50"></div>
            
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Dna className="w-5 h-5 text-orange-400" />
              Simulation Engine
            </h2>

            <div className="space-y-5">
              {/* Reproducible Replay Button */}
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
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Replaying Simulation...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    Reproducible Replay
                  </>
                )}
              </button>

              {/* Seed Control */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">
                    Random Seed
                  </label>
                  <span className="font-mono text-teal-400 text-lg">{seed}</span>
                </div>
                <button 
                  onClick={generateNewSeed}
                  disabled={isReplaying}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors disabled:opacity-50"
                  title="Generate New Seed"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed">
                Clicking <strong className="text-orange-400/80">Reproducible Replay</strong> clears the chart and re-runs the exact same sequence of pseudo-random numbers, proving the deterministic nature of the seeded Monte Carlo simulation.
              </p>
            </div>
          </div>

          {/* Parameters Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-teal-400" />
              Parameters
            </h2>

            <div className="space-y-6">
              {/* Sample Size Slider */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-400">Sample Size (N)</label>
                  <span className="font-mono text-teal-400">{sampleSize.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min="100" 
                  max="50000" 
                  step="100"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(parseInt(e.target.value))}
                  disabled={isReplaying}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500 disabled:opacity-50"
                />
              </div>

              {/* Variance Reduction Toggle */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div>
                  <label className="text-sm font-medium text-slate-300 block">Variance Reduction</label>
                  <span className="text-xs text-slate-500">Use Antithetic Variates</span>
                </div>
                <button
                  onClick={() => setUseVarianceReduction(!useVarianceReduction)}
                  disabled={isReplaying}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus