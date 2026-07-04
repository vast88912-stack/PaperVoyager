import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- PRNG & Math Helpers ---
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randn(prng: () => number) {
  let u = 1 - prng();
  let v = prng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

const TRUE_PROBABILITY = 0.001349898; // P(Z > 3) for Standard Normal

export default function App() {
  const [activeTab, setActiveTab] = useState('Importance Sampling');
  const [useIS, setUseIS] = useState(true);
  const [sampleSize, setSampleSize] = useState(5000);
  const [seed, setSeed] = useState(42);

  // --- Simulation Logic ---
  const simulationData = useMemo(() => {
    const prng = mulberry32(seed);
    const history = [];
    let sum = 0;
    let sumSq = 0;

    const steps = 100;
    const stepSize = Math.max(1, Math.floor(sampleSize / steps));

    for (let i = 1; i <= sampleSize; i++) {
      let y = 0;
      if (useIS) {
        // Importance Sampling: Sample from N(3, 1)
        const z = randn(prng) + 3;
        if (z > 3) {
          // Likelihood ratio W(z) = f(z) / g(z) = exp(-3z + 4.5)
          y = Math.exp(-3 * z + 4.5);
        }
      } else {
        // Standard MC: Sample from N(0, 1)
        const z = randn(prng);
        if (z > 3) {
          y = 1;
        }
      }

      sum += y;
      sumSq += y * y;

      if (i % stepSize === 0 || i === sampleSize) {
        const mean = sum / i;
        // Variance of the estimator (sample variance / n)
        const varianceEst = Math.max(0, (sumSq / i - mean * mean) / i);
        const stdErr = Math.sqrt(varianceEst);
        
        history.push({
          step: i,
          mean,
          variance: varianceEst,
          ciLower: Math.max(0, mean - 1.96 * stdErr),
          ciUpper: mean + 1.96 * stdErr,
        });
      }
    }
    return history;
  }, [seed, sampleSize, useIS]);

  const finalResult = simulationData[simulationData.length - 1];
  const themeColor = useIS ? 'teal' : 'orange';

  const handleReplay = useCallback(() => {
    setSeed(Math.floor(Math.random() * 1000000));
  }, []);

  // --- Chart Scaling ---
  const SVG_WIDTH = 800;
  const SVG_HEIGHT = 220;
  const Y_MAX_MEAN = 0.005; // Fixed axis for comparison

  const scaleX = (step: number) => (step / sampleSize) * SVG_WIDTH;
  const scaleYMean = (val: number) =>
    SVG_HEIGHT - (Math.min(val, Y_MAX_MEAN) / Y_MAX_MEAN) * SVG_HEIGHT;

  // Variance Chart Scaling (Logarithmic)
  const VAR_HEIGHT = 100;
  const MIN_LOG_VAR = -12;
  const MAX_LOG_VAR = -4;
  const scaleYVar = (val: number) => {
    const logVal = val <= 0 ? MIN_LOG_VAR : Math.log10(val);
    const clamped = Math.max(MIN_LOG_VAR, Math.min(MAX_LOG_VAR, logVal));
    return VAR_HEIGHT - ((clamped - MIN_LOG_VAR) / (MAX_LOG_VAR - MIN_LOG_VAR)) * VAR_HEIGHT;
  };

  // --- SVG Paths ---
  const meanPath = simulationData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(d.step)} ${scaleYMean(d.mean)}`)
    .join(' ');

  const ciPath =
    simulationData.map((d) => `${scaleX(d.step)},${scaleYMean(d.ciUpper)}`).join(' ') +
    ' ' +
    [...simulationData].reverse().map((d) => `${scaleX(d.step)},${scaleYMean(d.ciLower)}`).join(' ');

  const varPath = simulationData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(d.step)} ${scaleYVar(d.variance)}`)
    .join(' ');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-mono p-6 flex flex-col items-center">
      {/* Header & Tabs */}
      <div className="w-full max-w-5xl mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-4 tracking-tight">
          Monte Carlo Estimator Lab
        </h1>
        <div className="flex space-x-2 border-b border-slate-800 pb-px">
          {['Pi Estimation', 'Area Under Curve', 'Option Pricing', 'Importance Sampling'].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab
                    ? `bg-slate-800 text-${themeColor}-400 border-t border-l border-r border-slate-700`
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-5xl bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Top Control Bar */}
        <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-slate-100">
              Tail Probability: P(Z &gt; 3)
            </h2>
            <p className="text-sm text-slate-400">
              Estimating a rare event using Standard vs. Importance Sampling.
            </p>
          </div>

          <div className="flex items-center gap-6 bg-slate-900 px-5 py-3 rounded-lg border border-slate-700">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Importance Sampling
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={useIS}
                  onChange={() => setUseIS(!useIS)}
                />
                <div className={`w-12 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${useIS ? 'peer-checked:bg-teal-500' : 'peer-checked:bg-orange-500'}`}></div>
                <span className={`ml-3 text-sm font-bold ${useIS ? 'text-teal-400' : 'text-slate-500'}`}>
                  {useIS ? 'ON' : 'OFF'}
                </span>
              </label>
            </div>

            <div className="w-px h-10 bg-slate-700"></div>

            <div className="flex flex-col gap-2 min-w-[150px]">
              <div className="flex justify-between text-xs text-slate-400 uppercase tracking-wider font-semibold">
                <span>Sample Size (N)</span>
                <span className="text-slate-200">{sampleSize.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="100"
                max="20000"
                step="100"
                value={sampleSize}
                onChange={(e) => setSampleSize(parseInt(e.target.value))}
                className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-${themeColor}-500`}
              />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-slate-900/50 border-b border-slate-700">
          <div className="flex flex-col bg-slate-800 p-4 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">Estimate</span>
            <span className={`text-2xl font-bold text-${themeColor}-400`}>
              {finalResult.mean.toFixed(6)}
            </span>
          </div>
          <div className="flex flex-col bg-slate-800 p-4 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">True Value</span>
            <span className="text-2xl font-bold text-slate-300">
              {TRUE_PROBABILITY.toFixed(6)}
            </span>
          </div>
          <div className="flex flex-col bg-slate-800 p-4 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">Variance</span>
            <span className="text-2xl font-bold text-slate-300">
              {finalResult.variance.toExponential(2)}
            </span>
          </div>
          <div className="flex flex-col bg-slate-800 p-4 rounded-lg border border-slate-700 justify-center items-start">
            <span className="text-xs text-slate-400 uppercase tracking-wider mb-2">95% Confidence</span>
            <div className={`px-3 py-1 rounded-full bg-${themeColor}-900/30 text-${themeColor}-400 text-xs border border-${themeColor}-800/50 whitespace-nowrap`}>
              [{finalResult.ciLower.toFixed(6)}, {finalResult.ciUpper.toFixed(6)}]
            </div>
          </div>
        </div>

        {/* Charts Area */}
        <div className="p-6 space-y-6">
          {/* Convergence Chart */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Convergence vs True Value
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-3 h-3 rounded-full bg-slate-500"></span> True Value
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className={`w-3 h-3 rounded-full bg-${themeColor}-500`}></span> Estimate
                </div>
              </div>
            </div>
            <div className="relative w-full bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
              <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-auto block">
                {/* Grid Lines */}
                <line x1="0" y1={SVG_HEIGHT / 2} x2={SVG_WIDTH} y2={SVG_HEIGHT / 2} stroke="#334155" strokeDasharray="4" />
                
                {/* True Value Line */}
                <line
                  x1="0"
                  y1={scaleYMean(TRUE_PROBABILITY)}
                  x2={SVG_WIDTH}
                  y2={scaleYMean(TRUE_PROBABILITY)}
                  stroke="#64748b"
                  strokeWidth="2"
                  strokeDasharray="6"
                />

                {/* Confidence Interval Area */}
                <polygon
                  points={ciPath}
                  fill={useIS ? '#14b8a6' : '#f97316'}
                  opacity="0.15"
                />

                {/* Mean Path */}
                <path
                  d={meanPath}
                  fill="none"
                  stroke={useIS ? '#2dd4bf' : '#fb923c'}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Variance Chart */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Variance (Log Scale)
            </h3>
            <div className="relative w-full bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
              <svg viewBox={`0 0 ${SVG_WIDTH} ${VAR_HEIGHT}`} className="w-full h-auto block">
                 {/* Grid Lines */}
                 <line x1="0" y1={VAR_HEIGHT / 2} x2={SVG_WIDTH} y2={VAR_HEIGHT / 2} stroke="#334155" strokeDasharray="2" />
                <path
                  d={varPath}
                  fill="none"
                  stroke={useIS ? '#0f766e' : '#