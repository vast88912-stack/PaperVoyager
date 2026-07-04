import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- Helper Functions: PRNG & Math ---
// Mulberry32 PRNG for reproducible seeds
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform for standard normal distribution
function randomNormal(rng: () => number) {
  let u = 1 - rng();
  let v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// --- Icons (Raw SVGs to avoid external dependencies) ---
const ZapIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const ActivityIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

// --- Main Component ---
export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState('option');
  const [seed, setSeed] = useState<number>(1337);
  const [sampleSize, setSampleSize] = useState<number>(5000);
  const [useIS, setUseIS] = useState<boolean>(true);

  // --- Option Parameters (Deep Out-Of-The-Money Call) ---
  const S0 = 100;
  const K = 140; // Deep OOTM
  const T = 1;
  const r = 0.05;
  const sigma = 0.2;
  const EXACT_PRICE = 0.791; // Pre-calculated Black-Scholes price
  const mu_IS = 1.53; // Shift for Importance Sampling

  // --- Simulation Logic ---
  const simulationData = useMemo(() => {
    const rng = mulberry32(seed);
    const steps = 100;
    const stepSize = Math.max(1, Math.floor(sampleSize / steps));
    
    let sum = 0;
    let sumSq = 0;
    const history = [];

    for (let i = 1; i <= sampleSize; i++) {
      const Z = randomNormal(rng);
      let payoff = 0;

      if (useIS) {
        // Importance Sampling: Shift the distribution to sample the tail
        const Z_IS = Z + mu_IS;
        const ST = S0 * Math.exp((r - 0.5 * sigma * sigma) * T + sigma * Math.sqrt(T) * Z_IS);
        const rawPayoff = Math.max(ST - K, 0) * Math.exp(-r * T);
        
        // Likelihood Ratio (Radon-Nikodym derivative)
        const LR = Math.exp(-mu_IS * Z_IS + 0.5 * mu_IS * mu_IS);
        payoff = rawPayoff * LR;
      } else {
        // Standard Monte Carlo
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

    const finalResult = history[history.length - 1];
    return { history, finalResult };
  }, [seed, sampleSize, useIS]);

  const { history, finalResult } = simulationData;
  const ciLower = Math.max(0, finalResult.mean - 1.96 * finalResult.standardError);
  const ciUpper = finalResult.mean + 1.96 * finalResult.standardError;

  // --- Handlers ---
  const handleReplay = useCallback(() => {
    setSeed(Math.floor(Math.random() * 1000000));
  }, []);

  // --- Chart Rendering Helpers ---
  const chartWidth = 800;
  const chartHeight = 240;
  const padding = 20;
  
  // Dynamic Y-axis scaling based on data
  const maxMean = Math.max(...history.map(d => d.mean), EXACT_PRICE * 1.5);
  const minMean = 0;
  
  const getX = (step: number) => padding + ((step / sampleSize) * (chartWidth - padding * 2));
  const getY = (val: number) => chartHeight - padding - ((val - minMean) / (maxMean - minMean || 1)) * (chartHeight - padding * 2);

  const pathData = history.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.step)} ${getY(d.mean)}`).join(' ');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-teal-500/30">
      {/* Top Navigation / Tabs */}
      <header className="border-b border-slate-800 bg-slate-900/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ActivityIcon className="w-6 h-6 text-teal-400" />
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">MC Estimator Lab</h1>
          </div>
          <nav className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg">
            {['pi', 'area', 'option'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab 
                    ? 'bg-slate-700 text-teal-300 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab === 'pi' ? 'Pi Estimation' : tab === 'area' ? 'Area Under Curve' : 'Option Pricing'}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-100">Deep OOTM Call Option</h2>
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
              title="Re-run with new seed"
            >
              <RefreshIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* THE FOCUS: Importance Sampling Toggle Module */}
            <div className={`relative overflow-hidden rounded-xl border transition-all duration-500 ${
              useIS ? 'bg-teal-950/20 border-teal-500/30 shadow-[0_0_30px_-10px_rgba(20,184,166,0.15)]' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <ZapIcon className={`w-5 h-5 ${useIS ? 'text-teal-400' : 'text-slate-500'}`} />
                    <h3 className="text-lg font-semibold text-slate-100">Importance Sampling</h3>
                  </div>
                  
                  {/* Custom Toggle Switch */}
                  <button
                    onClick={() => setUseIS(!useIS)}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                      useIS ? 'bg-teal-500' : 'bg-slate-700'
                    }`}
                    role="switch"
                    aria-checked={useIS}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ease-in-out ${
                        useIS ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <p className="text-sm text-slate-400 mb-4">
                  {useIS 
                    ? "Active. We shift the drift of the underlying asset to force more paths into the money, then adjust the payoff by the likelihood ratio."
                    : "Inactive. Standard Monte Carlo simulates the true physical/risk-neutral measure. Rare events are easily missed."}
                </p>

                {/* Dynamic Badge */}
                <div className={`flex items-center space-x-2 text-xs font-medium px-3 py-2 rounded-lg border ${
                  useIS ? 'bg-teal-900/30 border-teal-800/50 text-teal-300' : 'bg-orange-900/20 border-orange-800/50 text-orange-40