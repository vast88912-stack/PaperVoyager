import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { RotateCcw, Play, Settings, ShieldAlert, Zap, BarChart2 } from 'lucide-react';

// --- PRNG & Math Helpers ---
const mulberry32 = (a: number) => {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const boxMuller = (rand: () => number) => {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

// --- Types ---
type ChartDataPoint = {
  step: number;
  estimate: number;
  variance: number;
};

// --- Main App Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState<'option' | 'pi' | 'area'>('option');
  const [seed, setSeed] = useState<number>(12345);
  const [sampleSize, setSampleSize] = useState<number>(10000);
  const [useIS, setUseIS] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [flashKey, setFlashKey] = useState<number>(0);

  const [results, setResults] = useState<{
    estimate: number;
    variance: number;
    ciLow: number;
    ciHigh: number;
    chartData: ChartDataPoint[];
    trueValue: number;
  }>({
    estimate: 0,
    variance: 0,
    ciLow: 0,
    ciHigh: 0,
    chartData: [],
    trueValue: 0.000382, // True value for Deep OTM Call E[max(X-3, 0)]
  });

  // --- Core Simulation Logic ---
  const runSimulation = useCallback(() => {
    setIsSimulating(true);
    
    // Slight delay to allow UI to render the "simulating" state if large N
    setTimeout(() => {
      const rand = mulberry32(seed);
      let sum = 0;
      let sumSq = 0;
      const data: ChartDataPoint[] = [];
      const recordInterval = Math.max(1, Math.floor(sampleSize / 100));

      const K = 3; // Strike price relative offset (Deep OTM)

      for (let i = 1; i <= sampleSize; i++) {
        let Y = 0;

        if (useIS) {
          // Importance Sampling: Proposal Z ~ N(K, 1)
          const Z = boxMuller(rand) + K;
          const payoff = Math.max(Z - K, 0);
          // Likelihood ratio W = P(Z) / Q(Z) = exp(-K*Z + K^2/2)
          const weight = Math.exp(-K * Z + (K * K) / 2);
          Y = payoff * weight;
        } else {
          // Standard Monte Carlo: X ~ N(0, 1)
          const X = boxMuller(rand);
          Y = Math.max(X - K, 0);
        }

        sum += Y;
        sumSq += Y * Y;

        if (i % recordInterval === 0 || i === sampleSize) {
          const currentMean = sum / i;
          const currentVar = (sumSq / i) - (currentMean * currentMean);
          data.push({
            step: i,
            estimate: currentMean,
            // Plot sample variance to show the drastic difference in the estimator's noise profile
            variance: currentVar, 
          });
        }
      }

      const finalMean = sum / sampleSize;
      const finalVar = (sumSq / sampleSize) - (finalMean * finalMean);
      const standardError = Math.sqrt(finalVar / sampleSize);
      
      setResults({
        estimate: finalMean,
        variance: finalVar,
        ciLow: finalMean - 1.96 * standardError,
        ciHigh: finalMean + 1.96 * standardError,
        chartData: data,
        trueValue: 0.000382,
      });
      
      setIsSimulating(false);
      setFlashKey(prev => prev + 1);
    }, 10);
  }, [seed, sampleSize, useIS]);

  // Trigger simulation on param changes
  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-6 selection:bg-teal-500/30">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
              <Zap className="text-teal-400 w-8 h-8" />
              MC Estimator Lab
            </h1>
            <p className="text-slate-500 mt-2 text-sm">Quant-minded experimental framework for variance reduction techniques.</p>
          </div>
          
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg">
            {(['option', 'pi', 'area'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeTab === tab 
                    ? 'bg-slate-800 text-teal-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                {tab === 'option' ? 'Deep OTM Option' : tab === 'pi' ? 'Pi Estimation' : 'Area Under Curve'}
              </button>
            ))}
          </div>
        </header>

        {/* Main Content Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Controls & Module Focus */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* FOCUS MODULE: Importance Sampling Toggle Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-bl-full -z-10 group-hover:bg-teal-500/10 transition-colors" />
              
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-orange-400" />
                Variance Reduction
              </h2>
              
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Evaluating a deep out-of-the-money call option (<code className="text-teal-300 bg-slate-950 px-1 py-0.5 rounded">K=3</code>). Standard MC rarely hits the payoff. Importance Sampling shifts the proposal distribution to the strike, drastically reducing variance.
              </p>

              {/* The Toggle Component */}
              <div className="flex flex-col gap-4 bg-slate-950/50 p-4 rounded-lg border border-slate-800/50">
                <div 
                  className="flex items-center justify-between cursor-pointer group/toggle"
                  onClick={() => setUseIS(!useIS)}
                >
                  <div className="flex flex-col">
                    <span className={`font-medium transition-colors ${useIS ? 'text-teal-400' : 'text-slate-300'}`}>
                      Importance Sampling
                    </span>
                    <span className="text-xs text-slate-500">
                      {useIS ? 'Active: Proposal Z ~ N(3, 1)' : 'Inactive: Proposal X ~ N(0, 1)'}
                    </span>
                  </div>
                  
                  {/* Custom Switch */}
                  <div className={`relative w-14 h-7 flex items-center rounded-full p-1 transition-colors duration-300 ${useIS ? 'bg-teal-500' : 'bg-slate-700'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${useIS ? 'translate-x-7' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Experiment Parameters */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
              <h2 className="text-lg font-semibold text-slate-200">Parameters</h2>
              
              {/* Sample Size Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-400">Sample Size (N)</label>
                  <span className="text-xs font-mono text-orange-400 bg-orange-400/10 px-2 py-1 rounded">
                    {sampleSize.toLocaleString()}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1000" 
                  max="100000" 
                  step="1000"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Number(e.target.value))}
                  className="w-full accent-orange-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Seed & Replay */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-400">PRNG Seed</label>
                  <code className="text-xs text-teal-400">{seed}</code>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-md text-sm transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    New Seed
                  </button>
                  <button 
                    onClick={runSimulation}
                    className="flex-1 flex items-center justify-center gap-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 border border-teal-500/30 py-2 rounded-md text-sm transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Replay
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Visualizations & Stats */}
          <div className="lg:col-span-8 flex flex-col gap-6" key={flashKey}>
            
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Final Estimate */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                <span className="text-sm text-slate-500 font-medium mb-2">Final Estimate E[Y]</span>
                <span className="text-2xl font-mono text-slate-100">
                  {results.estimate.toExponential(4)}
                </span>
                <span className="text-xs text-slate-500 mt-2">
                  True Value: ≈ {results.trueValue.toExponential(4)}
                </span>
              </div>

              {/* Variance Metric */}
              <div className={`bg-slate-900 border rounded-xl p-5 flex flex-col justify-between transition-colors duration-500 ${useIS ? 'border-teal-500/30' : 'border-orange-500/30'}`}>
                <span className="text-sm text-slate-500 font-medium mb-2">Sample Variance</span>
                <span className={`text-2xl font-mono ${useIS ? 'text-teal-400' : 'text-orange-400'}`}>
                  {results.variance.toExponential(4)}
                </span>
                <span className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  {useIS ? (
                     <><ShieldAlert className="w-3 h-3 text-teal-400" /> Variance reduced</>
                  ) : (
                    <><BarChart2 className="w-3 h-3 text-orange-400" /> High variance detected</>
                  )}
                </span>
              </div>

              {/* Confidence Interval Badge */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                <span className="text-sm text-slate-500 font-medium mb-2">95% Confidence Interval</span>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-mono text-slate-300">
                    L: {results.ciLow.toExponential(3)}
                  </span>
                  <span className="text-sm font-mono text-slate-300">
                    H: {results.ciHigh.toExponential(3)}
                  </span>
                </div>
                <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                  {/* Visual representation of CI width (conceptual) */}
                  <div 
                    className={`h-full ${useIS ? 'bg-teal-500' : 'bg-orange-500'}`} 
                    style={{ width: useIS ? '15%' : '85%', margin: '0 auto' }}
                  />
                </div>
              </div>

            </div>

            {/* Chart Area */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex-1 min-h-[400px] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-200">Convergence Analysis</h3>
                <div className="flex gap-4">
                  <span className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-3 h-3 rounded-full bg-teal-400"></div> Estimate
                  </span>
                  <span className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-3 h-3 rounded-full border-2 border-slate-600 border-dashed"></div> True Value
                  </span>
                </div>
              </div>
              
              <div className={`flex-1 w-full transition-opacity duration-300 ${isSimulating ? 'opacity-50' : 'opacity-100'}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={results.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="step" 
                      stroke="#475569" 
                      tick={{ fill: '#475569', fontSize: 12 }}
                      tickFormatter={(val) => `${(val/1000).toFixed(0)}k`}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="#475569" 
                      tick={{ fill: '#475569', fontSize: 12 }}
                      domain={[0, 0.001]}
                      tickFormatter={(val) => val.toExponential(1)}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px' }}
                      itemStyle={{ fontFamily: 'monospace' }}
                      labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                      formatter={(value: number) => value.toExponential(4)}
                    />
                    
                    {/* True Value Reference Line (simulated as data line for recharts simplicity) */}
                    <Line 
                      yAxisId="left"
                      type="step" 
                      dataKey="trueValue" 
                      stroke="#475569" 
                      strokeWidth={2}
                      strokeDasharray="5 5" 
                      dot={false}
                      isAnimationActive={false}
                    />

                    {/* Estimate Convergence Line */}
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="estimate" 
                      stroke="#2dd4bf" 
                      strokeWidth={2} 
                      dot={false}
                      animationDuration={1500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}