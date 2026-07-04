import React, { useState, useMemo, useRef, useEffect } from 'react';

// --- Helper: Simple Seeded PRNG (mulberry32) ---
function seededRandom(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export default function App() {
  // --- State ---
  const [sampleSize, setSampleSize] = useState<number>(1000);
  const [seed, setSeed] = useState<number>(1337);
  const [showIS, setShowIS] = useState<boolean>(true);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

  // --- Chart Dimensions ---
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

  // --- Data Generation (Simulating Variance Decay) ---
  const chartData = useMemo(() => {
    const random = seededRandom(seed);
    const data = [];
    const steps = 100;
    const stepSize = Math.max(1, Math.floor(sampleSize / steps));
    
    // Theoretical base variances for a toy problem (e.g., integrating e^-x)
    const baseVarStd = 0.25; 
    const baseVarIS = 0.02;  

    for (let i = 10; i <= sampleSize; i += stepSize) {
      // Add "empirical" noise that shrinks as N grows
      const noiseStd = (random() - 0.5) * (0.5 / Math.sqrt(i));
      const noiseIS = (random() - 0.5) * (0.1 / Math.sqrt(i));

      // Variance scales roughly as 1/N
      let valStd = Math.max(0.0001, (baseVarStd / i) + noiseStd * (baseVarStd / Math.sqrt(i)));
      let valIS = Math.max(0.00001, (baseVarIS / i) + noiseIS * (baseVarIS / Math.sqrt(i)));

      data.push({
        n: i,
        stdVar: valStd,
        isVar: valIS
      });
    }
    return data;
  }, [sampleSize, seed]);

  // --- Chart Scaling Logic ---
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
    return max * 1.1; // 10% headroom
  }, [chartData, showIS]);

  const scaleX = (n: number) => padding.left + ((n - minX) / (maxX - minX)) * innerWidth;
  const scaleY = (v: number) => padding.top + innerHeight - ((v / maxY) * innerHeight);

  // --- SVG Path Generation ---
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

  // --- Handlers ---
  const handleReplay = () => {
    setIsReplaying(true);
    setSeed(prev => prev + Math.floor(Math.random() * 1000));
    setTimeout(() => setIsReplaying(false), 300);
  };

  // --- Derived Stats for Badges ---
  const finalStdVar = chartData[chartData.length - 1]?.stdVar || 0;
  const finalISVar = chartData[chartData.length - 1]?.isVar || 0;
  
  // 95% CI roughly 1.96 * sqrt(Var)
  const ciStd = 1.96 * Math.sqrt(finalStdVar);
  const ciIS = 1.96 * Math.sqrt(finalISVar);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-mono p-4 md:p-8 flex flex-col items-center justify-center selection:bg-teal-900 selection:text-teal-100">
      
      <div className="w-full max-w-5xl bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* --- Header --- */}
        <div className="bg-[#1e293b] border-b border-slate-800 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
              <svg className={`w-4 h-4 ${isReplaying ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              REPLAY
            </button>
          </div>
        </div>

        {/* --- Main Content --- */}
        <div className="p-6 flex flex-col gap-6">
          
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-900/50 p-5 rounded-xl border border-slate-800/50">
            
            {/* Slider */}
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

            {/* Toggles */}
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

          {/* --- Chart Area --- */}
          <div 
            ref={chartRef} 
            className="w-full h-[400px] bg-[#020617] rounded-xl border border-slate-800 relative overflow-hidden"
          >
            {/* Grid Background Patterns */}
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
                <linearGradient id="fade-below-teal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Y-Axis Grid Lines & Labels */}
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

              {/* X-Axis Grid Lines & Labels */}
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

              {/* Axis Lines */}
              <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#334155" strokeWidth="2" />
              <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#334155" strokeWidth="2" />

              {/* Axis Titles */}
              <text x={padding.left + innerWidth / 2} y={height - 5} fill="#94a3b8" fontSize="12" textAnchor="middle" fontWeight="bold">Sample Size (N)</text>
              <text x={-(padding.top + innerHeight / 2)} y={20} fill="#94a3b8" fontSize="12" textAnchor="middle" fontWeight="bold" transform="rotate(-90)">Empirical Variance (σ²)</text>

              {/* Data Paths */}
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
            
            {/* Legend Overlay */}
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

          {/* --- Footer Stats / Badges --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Standard MC Badge */}
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

            {/* Importance Sampling Badge */}
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