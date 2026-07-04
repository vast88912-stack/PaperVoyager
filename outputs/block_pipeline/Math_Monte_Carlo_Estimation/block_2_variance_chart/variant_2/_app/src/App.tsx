import React, { useState, useMemo, useCallback } from 'react';
import { 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Settings, 
  RefreshCw, 
  Activity, 
  Hash, 
  BarChart2, 
  Zap, 
  ShieldCheck 
} from 'lucide-react';

// --- Math & PRNG Utilities ---

// Seeded PRNG (Mulberry32)
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Box-Muller transform for standard normal distribution
function randomNormal(prng: () => number) {
  let u1 = prng();
  let u2 = prng();
  // Protect against log(0)
  if (u1 <= 1e-10) u1 = 1e-10;
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

// --- Experiment Definitions ---

type ExperimentType = 'pi' | 'auc' | 'option';

interface ExperimentConfig {
  id: ExperimentType;
  title: string;
  description: string;
  trueValue: number;
  // Returns a single sample. 
  // If useVR (Variance Reduction) is true, it uses Antithetic Variates or Importance Sampling.
  sample: (prng: () => number, useVR: boolean) => number;
}

const EXPERIMENTS: Record<ExperimentType, ExperimentConfig> = {
  pi: {
    id: 'pi',
    title: 'Pi Estimation',
    description: 'Estimating π via circle area: X,Y ~ U(-1,1). Variance reduction via Antithetic Variates.',
    trueValue: Math.PI,
    sample: (prng, useVR) => {
      const x = prng() * 2 - 1;
      const y = prng() * 2 - 1;
      const v1 = (x * x + y * y <= 1) ? 4 : 0;
      
      if (useVR) {
        // Antithetic variate: perfectly negatively correlated uniform draws
        const x2 = -x;
        const y2 = -y;
        const v2 = (x2 * x2 + y2 * y2 <= 1) ? 4 : 0;
        return (v1 + v2) / 2;
      }
      return v1;
    }
  },
  auc: {
    id: 'auc',
    title: 'Area Under Curve',
    description: 'Integral of f(x) = e^(-x) from 0 to 1. VR uses Antithetic pairs (X and 1-X).',
    trueValue: 1 - 1 / Math.E, // ~0.63212
    sample: (prng, useVR) => {
      const x = prng();
      const v1 = Math.exp(-x);
      
      if (useVR) {
        const v2 = Math.exp(-(1 - x));
        return (v1 + v2) / 2;
      }
      return v1;
    }
  },
  option: {
    id: 'option',
    title: 'European Call Option',
    description: 'Black-Scholes MC pricing. S=100, K=100, r=5%, σ=20%, T=1. VR uses Antithetic Z and -Z.',
    trueValue: 10.45058, // Analytical BS Price
    sample: (prng, useVR) => {
      const S0 = 100, K = 100, r = 0.05, sigma = 0.2, T = 1;
      const z = randomNormal(prng);
      
      const ST1 = S0 * Math.exp((r - 0.5 * sigma * sigma) * T + sigma * Math.sqrt(T) * z);
      const payoff1 = Math.max(ST1 - K, 0) * Math.exp(-r * T);
      
      if (useVR) {
        const ST2 = S0 * Math.exp((r - 0.5 * sigma * sigma) * T + sigma * Math.sqrt(T) * (-z));
        const payoff2 = Math.max(ST2 - K, 0) * Math.exp(-r * T);
        return (payoff1 + payoff2) / 2;
      }
      return payoff1;
    }
  }
};

// --- Main Application Component ---

export default function App() {
  // --- State ---
  const [experimentId, setExperimentId] = useState<ExperimentType>('option');
  const [sampleSize, setSampleSize] = useState<number>(10000);
  const [useVR, setUseVR] = useState<boolean>(false);
  const [seed, setSeed] = useState<number>(1337);
  const [replayTrigger, setReplayTrigger] = useState<number>(0);

  // --- Handlers ---
  const handleReplay = useCallback(() => {
    setReplayTrigger(prev => prev + 1);
  }, []);

  const handleNewSeed = useCallback(() => {
    setSeed(Math.floor(Math.random() * 1000000));
    setReplayTrigger(prev => prev + 1);
  }, []);

  // --- Simulation Engine ---
  const { chartData, finalStats } = useMemo(() => {
    // Dependency on replayTrigger forces re-run even if other params are same
    const _trigger = replayTrigger; 
    
    const config = EXPERIMENTS[experimentId];
    const prng = mulberry32(seed);
    
    const data = [];
    let sum = 0;
    let sumSq = 0;
    
    // To keep chart performant, we record a max of 100 data points
    const steps = 100;
    const recordInterval = Math.max(1, Math.floor(sampleSize / steps));

    for (let i = 1; i <= sampleSize; i++) {
      const val = config.sample(prng, useVR);
      sum += val;
      sumSq += val * val;

      if (i % recordInterval === 0 || i === sampleSize) {
        const mean = sum / i;
        // Sample variance: (sumSq / n - mean^2) * (n / (n-1))
        const variance = i > 1 ? ((sumSq / i) - (mean * mean)) * (i / (i - 1)) : 0;
        const se = Math.sqrt(variance / i);
        
        data.push({
          n: i,
          estimate: mean,
          variance: variance,
          se: se,
          ciLower: mean - 1.96 * se,
          ciUpper: mean + 1.96 * se,
          trueValue: config.trueValue
        });
      }
    }

    const finalPoint = data[data.length - 1];
    const errorAbs = Math.abs(finalPoint.estimate - config.trueValue);
    const errorPct = (errorAbs / config.trueValue) * 100;

    return { 
      chartData: data,
      finalStats: {
        estimate: finalPoint.estimate,
        variance: finalPoint.variance,
        se: finalPoint.se,
        ciLower: finalPoint.ciLower,
        ciUpper: finalPoint.ciUpper,
        errorAbs,
        errorPct
      }
    };
  }, [experimentId, sampleSize, useVR, seed, replayTrigger]);

  const activeConfig = EXPERIMENTS[experimentId];

  // --- Custom Tooltip for Chart ---
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl text-sm font-mono">
          <p className="text-slate-300 mb-2 border-b border-slate-700 pb-1">N = {label}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey === 'trueValue' && index > 0 && payload[index-1].dataKey === 'trueValue') return null; // deduplicate
            
            let color = entry.color;
            let name = entry.name;
            let value = entry.value;

            if (name === 'CI Band') return null; // Handled visually

            return (
              <div key={index} className="flex justify-between gap-4 py-0.5" style={{ color }}>
                <span>{name}:</span>
                <span className="font-bold">{typeof value === 'number' ? value.toFixed(6) : value}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans selection:bg-teal-500/30">
      
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-orange-400 bg-clip-text text-transparent flex items-center gap-3">
            <Activity className="w-8 h-8 text-teal-500" />
            Monte Carlo Estimator Lab
          </h1>
          <p className="text-slate-400 mt-2 text-sm md:text-base">
            Visualize $O(1/\sqrt{N})$ convergence and variance reduction techniques.
          </p>
        </div>
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 shadow-inner">
          {(Object.keys(EXPERIMENTS) as ExperimentType[]).map((key) => (
            <button
              key={key}
              onClick={() => setExperimentId(key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                experimentId === key 
                  ? 'bg-slate-800 text-teal-400 shadow-sm border border-slate-700' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              {EXPERIMENTS[key].