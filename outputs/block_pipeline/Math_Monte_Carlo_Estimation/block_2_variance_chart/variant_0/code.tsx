import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { RefreshCw, Settings2, Activity, ShieldCheck, Hash } from 'lucide-react';

// Runtime dependencies: recharts, lucide-react

// --- PRNG for Reproducibility ---
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Math Helpers ---
// Target: Integrate e^(-x^2) from 0 to 1. True value ≈ 0.746824
const TRUE_VALUE = 0.746824;

export default function App() {
  const [sampleSize, setSampleSize] = useState<number>(5000);
  const [seed, setSeed] = useState<number>(1337);
  const [useIS, setUseIS] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Generate simulation data
  const chartData = useMemo(() => {
    const random = mulberry32(seed);
    const data = [];
    
    let sumStd = 0;
    let sumSqStd = 0;
    
    let sumIS = 0;
    let sumSqIS = 0;

    const steps = 100;
    const stepSize = Math.max(1, Math.floor(sampleSize / steps));

    for (let i = 1; i <= sampleSize; i++) {
      const u = random();
      
      // Standard MC: x ~ U(0,1)
      const xStd = u;
      const yStd = Math.exp(-(xStd * xStd));
      sumStd += yStd;
      sumSqStd += yStd * yStd;

      // Importance Sampling: p(x) = 2(1-x) -> x = 1 - sqrt(1-u)
      const xIS = 1 - Math.sqrt(1 - u);
      // To avoid division by zero near x=1
      const pX = Math.max(2 * (1 - xIS), 0.0001); 
      const yIS = Math.exp(-(xIS * xIS)) / pX;
      sumIS += yIS;
      sumSqIS += yIS * yIS;

      if (i % stepSize === 0 || i === sampleSize) {
        const meanStd = sumStd / i;
        const varStd = (sumSqStd / i - meanStd * meanStd) / i; // Variance of the mean (Standard Error ^ 2)
        
        const meanIS = sumIS / i;
        const varIS = (sumSqIS / i - meanIS * meanIS) / i;

        data.push({
          n: i,
          stdVariance: Math.max(varStd, 1e-9), // clamp for log scale
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
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 font-sans selection:bg-teal-500/30">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Controls Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
              <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-orange-400" />
                Parameters
              </h2>
              
              <div className="space-y-6">
                {/* Sample Size Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-slate-400">Sample Size (N)</label>
                    <span className="text-sm font-mono text-teal-400">{sampleSize.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="50000"
                    step="100"
                    value={sampleSize}
                    onChange={(e) => setSampleSize(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                  />
                </div>

                {/* Importance Sampling Toggle */}
                <div className="pt-4 border-t border-slate-800">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">
                      Importance Sampling
                    </span>
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={useIS}
                        onChange={(e) => setUseIS(e.target.checked)}
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

            {/* Metrics Badge */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-bl-full -z-0"></div>
              <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2 relative z-10">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                Live Metrics
              </h2>
              
              <div className="space-y-4 relative z-10">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Final Estimate</div>
                  <div className="text-2xl font-mono text-slate-100">
                    {currentEstimate.toFixed(6)}
                  </div>
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
                  <div className="text-sm font-mono text-orange-400">
                    {currentVariance.toExponential(4)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col min-h-[500px]">
            <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider mb-6">
              Variance Convergence (Log Scale)
            </h2>
            
            <div className="flex-1 w-full h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis 
                    dataKey="n" 
                    stroke="#94a3b8" 
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : val}
                    label={{ value: 'Sample Size (N)', position: 'insideBottom', offset: -15, fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis 
                    scale="log" 
                    domain={['auto', 'auto']} 
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={(val) => val.toExponential(1)}
                    label={{ value: 'Variance', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                    itemStyle={{ fontFamily: 'monospace', fontSize: '13px' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '12px' }}
                    formatter={(value: number, name: string) => [
                      value.toExponential(4), 
                      name === 'stdVariance' ? 'Standard MC' : 'Importance Sampling'
                    ]}
                    labelFormatter={(label) => `N = ${label}`}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '13px', color: '#cbd5e1' }}
                  />
                  
                  <Line 
                    type="monotone" 
                    dataKey="stdVariance" 
                    name="Standard MC" 
                    stroke="#f97316" 
                    strokeWidth={2} 
                    dot={false}
                    activeDot={{ r: 6, fill: '#f97316', stroke: '#0f172a', strokeWidth: 2 }}
                    opacity={useIS ? 0.4 : 1}
                  />
                  
                  {useIS && (
                    <Line 
                      type="monotone" 
                      dataKey="isVariance" 
                      name="Importance Sampling" 
                      stroke="#14b8a6" 
                      strokeWidth={2} 
                      dot={false}
                      activeDot={{ r: 6, fill: '#14b8a6', stroke: '#0f172a', strokeWidth: 2 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}