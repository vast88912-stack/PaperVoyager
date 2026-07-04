import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- INLINED ICONS ---
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="6 3 20 12 6 21 6 3" />
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

// --- TYPES & CONSTANTS ---
type Algorithm = 'K-Means' | 'K-Means++' | 'MiniBatch' | 'GMM';

interface DataPoint {
  iteration: number;
  inertia: number;
}

const MAX_ITERATIONS = 30;
const SIMULATION_SPEED_MS = 250;

const CANDY_COLORS = {
  pink: '#FF66B2',
  cyan: '#00E5FF',
  mint: '#00FF9D',
  yellow: '#FFEB3B',
  violet: '#B266FF'
};

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [iteration, setIteration] = useState(0);
  const [history, setHistory] = useState<DataPoint[]>([]);
  const [algorithm, setAlgorithm] = useState<Algorithm>('K-Means');
  const [kValue, setKValue] = useState(5);
  const [miniBatchSize, setMiniBatchSize] = useState(100);
  const [silhouetteScore, setSilhouetteScore] = useState<number | null>(null);

  // We use refs to keep track of simulation values inside the effect without constantly re-triggering it
  const simulationRef = useRef({
    iter: 0,
    currentInertia: 0,
    algo: algorithm,
    k: kValue,
    batchSize: miniBatchSize
  });

  // Sync refs when dependencies change
  useEffect(() => {
    simulationRef.current.algo = algorithm;
    simulationRef.current.k = kValue;
    simulationRef.current.batchSize = miniBatchSize;
  }, [algorithm, kValue, miniBatchSize]);

  // Reset function
  const resetSimulation = () => {
    setIsRunning(false);
    setIteration(0);
    setHistory([]);
    setSilhouetteScore(null);
    simulationRef.current.iter = 0;
    
    // Initial Inertia depends on K (higher K = lower starting inertia)
    const baseInertia = 15000;
    const initialInertia = baseInertia / Math.sqrt(kValue);
    
    // Apply init strategy modifiers
    let startingInertia = initialInertia;
    if (algorithm === 'K-Means++') startingInertia *= 0.6; // Better starting point
    if (algorithm === 'GMM') startingInertia *= 1.2; // Representing higher initial NLL
    
    simulationRef.current.currentInertia = startingInertia;
    setHistory([{ iteration: 0, inertia: startingInertia }]);
  };

  // Initial setup
  useEffect(() => {
    resetSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algorithm, kValue]); // Reset when core params change

  // Simulation Loop
  useEffect(() => {
    let interval: number | undefined;

    if (isRunning && simulationRef.current.iter < MAX_ITERATIONS) {
      interval = window.setInterval(() => {
        const state = simulationRef.current;
        state.iter += 1;

        let nextInertia = state.currentInertia;
        const noiseBase = nextInertia * 0.02;

        switch (state.algo) {
          case 'K-Means':
            nextInertia = nextInertia * 0.82 + (Math.random() * noiseBase - noiseBase / 2);
            break;
          case 'K-Means++':
            // Faster convergence
            nextInertia = nextInertia * 0.70 + (Math.random() * (noiseBase * 0.5));
            break;
          case 'MiniBatch':
            // Higher noise level dependent on batch size
            const batchNoise = (200 / state.batchSize) * noiseBase;
            nextInertia = nextInertia * 0.85 + (Math.random() * batchNoise - batchNoise / 3);
            break;
          case 'GMM':
            // Smoother, slower convergence
            nextInertia = nextInertia * 0.90 + (Math.random() * (noiseBase * 0.2));
            break;
        }

        // Prevent negative inertia
        nextInertia = Math.max(nextInertia, 100);
        state.currentInertia = nextInertia;

        setIteration(state.iter);
        setHistory(prev => [...prev, { iteration: state.iter, inertia: nextInertia }]);

        if (state.iter >= MAX_ITERATIONS) {
          setIsRunning(false);
          // Calculate mock silhouette score at the end
          const score = 0.4 + (Math.random() * 0.3) + (state.algo === 'K-Means++' ? 0.1 : 0);
          setSilhouetteScore(Math.min(score, 0.99));
        }
      }, SIMULATION_SPEED_MS);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const toggleRunning = () => {
    if (iteration >= MAX_ITERATIONS) {
      resetSimulation();
    }
    setIsRunning(!isRunning);
  };

  // Render variables
  const currentInertia = history.length > 0 ? history[history.length - 1].inertia : 0;
  
  // Chart dimensions & scaling
  const chartWidth = 800;
  const chartHeight = 300;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const maxInertia = useMemo(() => {
    return history.length > 0 ? history[0].inertia * 1.1 : 10000;
  }, [history]);

  const getCoordinates = (index: number, value: number) => {
    const x = padding.left + (index / MAX_ITERATIONS) * innerWidth;
    const y = padding.top + innerHeight - (value / maxInertia) * innerHeight;
    return { x, y };
  };

  // Build SVG Path
  const pathD = history.length === 0 
    ? '' 
    : history.map((point, i) => {
        const { x, y } = getCoordinates(point.iteration, point.inertia);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');

  const areaD = pathD 
    ? `${pathD} L ${getCoordinates(history[history.length - 1].iteration, 0).x} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`
    : '';

  // Current algorithm theme color
  const themeColor = {
    'K-Means': CANDY_COLORS.pink,
    'K-Means++': CANDY_COLORS.cyan,
    'MiniBatch': CANDY_COLORS.yellow,
    'GMM': CANDY_COLORS.violet,
  }[algorithm];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-slate-800">
      
      <div className="max-w-4xl w-full bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden flex flex-col">
        
        {/* Header section */}
        <div className="p-8 pb-4 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          {/* Decorative Blob */}
          <div 
            className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: themeColor, transition: 'background-color 0.5s ease' }}
          />

          <div>
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="p-2 rounded-xl text-white shadow-lg"
                style={{ backgroundColor: themeColor }}
              >
                <ActivityIcon />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Live Inertia Monitor</h1>
            </div>
            <p className="text-slate-500 font-medium">Tracking clustering convergence in real-time</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(['K-Means', 'K-Means++', 'MiniBatch', 'GMM'] as Algorithm[]).map((algo) => (
              <button
                key={algo}
                onClick={() => setAlgorithm(algo)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                  algorithm === algo 
                    ? 'bg-slate-900 text-white shadow-md transform scale-105' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {algo}
              </button>
            ))}
          </div>
        </div>

        {/* Controls & Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-slate-50/50">
          
          {/* Controls Panel */}
          <div className="col-span-1 space-y-6">
            
            <div className="flex items-center gap-4">
              <button
                onClick={toggleRunning}
                className="flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-2xl font-bold text-white transition-all duration-300 shadow-xl shadow-opacity-20 hover:-translate-y-1 active:translate-y-0"
                style={{ backgroundColor: themeColor, boxShadow: `0 10px 25px -5px ${themeColor}60` }}
              >
                {isRunning ? <PauseIcon /> : <PlayIcon />}
                {isRunning ? 'Pause' : (iteration >= MAX_ITERATIONS ? 'Restart' : 'Start')}
              </button>
              
              <button
                onClick={resetSimulation}
                className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm"
                title="Reset Simulation"
              >
                <RefreshIcon />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clusters (k)</label>
                  <span className="text-sm font-black text-slate-700">{kValue}</span>
                </div>
                <input 
                  type="range" 
                  min="2" max="20" 
                  value={kValue}
                  onChange={(e) => setKValue(Number(e.target.value))}
                  disabled={isRunning}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900 disabled:opacity-50"
                  style={{ accentColor: themeColor }}
                />
              </div>

              {algorithm === 'MiniBatch' && (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 animate-fade-in">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batch Size</label>
                    <span className="text-sm font-black text-slate-700">{miniBatchSize}</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" max="500" step="10"
                    value={miniBatchSize}
                    onChange={(e) => setMiniBatchSize(Number(e.target.value))}
                    disabled={isRunning}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                    style={{ accentColor: themeColor }}
                  />
                </div>
              )}
            </div>

          </div>

          {/* Metrics Panel */}
          <div className="col-span-2 grid grid-cols-2 gap-4">
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -z-10" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Current Inertia</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tabular-nums tracking-tighter" style={{ color: themeColor }}>
                  {Math.round(currentInertia).toLocaleString()}
                </span>
                {isRunning && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: themeColor }}></span>
                    <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: themeColor }}></span>
                  </span>
                )}
              </div>
              <div className="mt-2 text-sm text-slate-500 font-medium">
                Iteration: <span className="text-slate-800 font-bold">{iteration}</span> / {MAX_ITERATIONS}
              </div>
            </div>

            <div className={`p-6 rounded-3xl shadow-sm border flex flex-col justify-center transition-all duration-500 ${silhouetteScore !== null ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${silhouetteScore !== null ? 'text-slate-400' : 'text-slate-400'}`}>
                Silhouette Score
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black tabular-nums tracking-tighter ${silhouetteScore !== null ? 'text-white' : 'text-slate-300'}`}>
                  {silhouetteScore !== null ? silhouetteScore.toFixed(3) : '---'}
                </span>
              </div>
              <div className={`mt-2 text-sm font-medium ${silhouetteScore !== null ? 'text-slate-400' : 'text-slate-300'}`}>
                {silhouetteScore !== null ? 'Final evaluation complete' : 'Waiting for convergence...'}
              </div>
            </div>

          </div>
        </div>

        {/* Chart Section */}
        <div className="p-8 relative">
          
          <div className="w-full overflow-x-auto custom-scrollbar">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-auto min-w-[600px] drop-shadow-sm"
              style={{ maxHeight: '300px' }}
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={themeColor} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={themeColor} stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={themeColor} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={themeColor} stopOpacity="1" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = padding.top + innerHeight * ratio;
                const val = Math.round(maxInertia * (1 - ratio));
                return (
                  <g key={`grid-${ratio}`}>
                    <line 
                      x1={padding.left} y1={y} 
                      x2={chartWidth - padding.right} y2={y} 
                      stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4"
                    />
                    <text 
                      x={padding.left - 10} y={y + 4} 
                      fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="end"
                    >
                      {val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                    </text>
                  </g>
                );
              })}

              {/* X Axis labels */}
              {[0, 10, 20, 30].map((iter) => {
                const x = padding.left + (iter / MAX_ITERATIONS) * innerWidth;
                return (
                  <g key={`x-axis-${iter}`}>
                    <text 
                      x={x} y={chartHeight - 15} 
                      fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle"
                    >
                      Iter {iter}
                    </text>
                  </g>
                );
              })}

              {/* Area under curve */}
              <path 
                d={areaD} 
                fill="url(#areaGradient)" 
                className="transition-all duration-300 ease-linear"
              />

              {/* Main Line */}
              <path 
                d={pathD} 
                fill="none" 
                stroke="url(#lineGradient)" 
                strokeWidth="4" 
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300 ease-linear"
              />

              {/* Data Points */}
              {history.map((point, i) => {
                const { x, y } = getCoordinates(point.iteration, point.inertia);
                const isLast = i === history.length - 1;
                return (
                  <circle 
                    key={i}
                    cx={x} 
                    cy={y} 
                    r={isLast ? 6 : 3} 
                    fill={isLast ? "#ffffff" : themeColor} 
                    stroke={themeColor}
                    strokeWidth={isLast ? 3 : 0}
                    className="transition-all duration-300 ease-linear"
                    style={{ filter: isLast ? `drop-shadow(0 0 6px ${themeColor})` : 'none' }}
                  />
                );
              })}
            </svg>
          </div>
        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}