import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Types & Interfaces ---
interface DataPoint {
  iteration: number;
  inertia: number;
  silhouette: number;
}

type Algorithm = 'K-Means' | 'K-Medoids' | 'MiniBatch' | 'GMM';

// --- Constants & Helpers ---
const MAX_HISTORY = 50;
const CHART_WIDTH = 800;
const CHART_HEIGHT = 300;
const Y_PADDING = 40;

const ALGORITHMS: Algorithm[] = ['K-Means', 'K-Medoids', 'MiniBatch', 'GMM'];

const CANDY_COLORS = {
  pink: '#f472b6',
  cyan: '#22d3ee',
  yellow: '#fde047',
  purple: '#c084fc',
  mint: '#6ee7b7',
};

// --- Main Application Component ---
export default function App() {
  // --- State ---
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [algorithm, setAlgorithm] = useState<Algorithm>('K-Means');
  const [kValue, setKValue] = useState<number>(3);
  const [history, setHistory] = useState<DataPoint[]>([]);
  const [iterationCounter, setIterationCounter] = useState<number>(0);
  
  // Refs for simulation state to use in interval without dependency cycles
  const currentInertiaRef = useRef<number>(10000);
  const currentSilhouetteRef = useRef<number>(0.1);

  // --- Simulation Logic ---
  const resetSimulation = () => {
    setHistory([]);
    setIterationCounter(0);
    // Initial inertia based on K
    currentInertiaRef.current = 15000 + Math.random() * 2000;
    currentSilhouetteRef.current = 0.05 + Math.random() * 0.1;
  };

  useEffect(() => {
    resetSimulation();
  }, [algorithm, kValue]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isRunning) {
      intervalId = setInterval(() => {
        setIterationCounter((prev) => {
          const nextIter = prev + 1;
          
          // Calculate target values based on algorithm and K
          const targetInertia = 10000 / (kValue * 1.5) + (algorithm === 'MiniBatch' ? 500 : 0);
          const targetSilhouette = Math.min(0.85, 0.3 + (kValue * 0.08));

          // Convergence rates
          const inertiaRate = algorithm === 'GMM' ? 0.08 : algorithm === 'MiniBatch' ? 0.15 : 0.25;
          const noise = algorithm === 'MiniBatch' ? (Math.random() - 0.5) * 400 : (Math.random() - 0.5) * 50;

          // Update current values
          const diff = currentInertiaRef.current - targetInertia;
          currentInertiaRef.current = Math.max(targetInertia * 0.5, currentInertiaRef.current - (diff * inertiaRate) + noise);

          const silDiff = targetSilhouette - currentSilhouetteRef.current;
          currentSilhouetteRef.current = currentSilhouetteRef.current + (silDiff * 0.1) + (Math.random() - 0.5) * 0.02;

          const newPoint: DataPoint = {
            iteration: nextIter,
            inertia: currentInertiaRef.current,
            silhouette: currentSilhouetteRef.current,
          };

          setHistory((prevHistory) => {
            const nextHistory = [...prevHistory, newPoint];
            if (nextHistory.length > MAX_HISTORY) {
              return nextHistory.slice(nextHistory.length - MAX_HISTORY);
            }
            return nextHistory;
          });

          return nextIter;
        });
      }, 400); // 400ms tick for live feel
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, algorithm, kValue]);

  // --- Chart Calculations ---
  const maxInertia = useMemo(() => {
    if (history.length === 0) return 20000;
    return Math.max(...history.map((d) => d.inertia)) * 1.1;
  }, [history]);

  const minInertia = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.max(0, Math.min(...history.map((d) => d.inertia)) * 0.9);
  }, [history]);

  const getX = (index: number, total: number) => {
    if (total <= 1) return 0;
    return (index / (MAX_HISTORY - 1)) * CHART_WIDTH;
  };

  const getY = (inertia: number) => {
    const range = maxInertia - minInertia;
    if (range === 0) return CHART_HEIGHT / 2;
    return CHART_HEIGHT - Y_PADDING - ((inertia - minInertia) / range) * (CHART_HEIGHT - Y_PADDING * 2);
  };

  const linePath = useMemo(() => {
    if (history.length === 0) return '';
    return history
      .map((d, i) => {
        const x = getX(history.length < MAX_HISTORY ? i : i + (MAX_HISTORY - history.length), history.length);
        const y = getY(d.inertia);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [history, maxInertia, minInertia]);

  const areaPath = useMemo(() => {
    if (history.length < 2) return '';
    const firstX = getX(history.length < MAX_HISTORY ? 0 : (MAX_HISTORY - history.length), history.length);
    const lastX = getX(history.length < MAX_HISTORY ? history.length - 1 : MAX_HISTORY - 1, history.length);
    return `${linePath} L ${lastX} ${CHART_HEIGHT} L ${firstX} ${CHART_HEIGHT} Z`;
  }, [linePath, history.length]);

  const latestPoint = history[history.length - 1];
  const prevPoint = history[history.length - 2];
  const delta = latestPoint && prevPoint ? latestPoint.inertia - prevPoint.inertia : 0;

  return (
    <div className="min-h-screen bg-[#fdfbfb] p-8 font-sans text-slate-800 flex items-center justify-center">
      <div className="max-w-5xl w-full bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(244,114,182,0.15)] p-8 border border-pink-100">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 mb-2">
              Live Inertia Chart
            </h1>
            <p className="text-slate-500 font-medium text-sm">
              Real-time clustering convergence monitoring
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            {/* Algorithm Selector */}
            <div className="flex bg-white rounded-xl shadow-sm p-1 border border-slate-100">
              {ALGORITHMS.map((algo) => (
                <button
                  key={algo}
                  onClick={() => setAlgorithm(algo)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    algorithm === algo
                      ? 'bg-gradient-to-br from-cyan-400 to-cyan-500 text-white shadow-md'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {algo}
                </button>
              ))}
            </div>

            {/* K Slider */}
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
              <span className="text-sm font-bold text-slate-500">K = {kValue}</span>
              <input
                type="range"
                min="2"
                max="10"
                value={kValue}
                onChange={(e) => setKValue(parseInt(e.target.value))}
                className="w-24 accent-pink-500"
              />
            </div>

            {/* Play/Pause/Reset */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl shadow-sm transition-all text-white ${
                  isRunning ? 'bg-pink-500 hover:bg-pink-600' : 'bg-mint-400 hover:bg-mint-500'
                }`}
                style={{ backgroundColor: isRunning ? CANDY_COLORS.pink : CANDY_COLORS.mint }}
              >
                {isRunning ? (
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
                ) : (
                  <svg className="w-4 h-4 fill-current ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <button
                onClick={resetSimulation}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Inertia Card */}
          <div className="bg-gradient-to-br from-pink-50 to-white p-6 rounded-2xl border border-pink-100 shadow-sm relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-pink-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50"></div>
            <h3 className="text-pink-600 text-xs font-bold uppercase tracking-wider mb-2">Current Inertia</h3>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold text-slate-800 tabular-nums">
                {latestPoint ? latestPoint.inertia.toFixed(0) : '---'}
              </span>
              {delta !== 0 && (
                <span className={`text-sm font-bold flex items-center ${delta < 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {delta < 0 ? '↓' : '↑'} {Math.abs(delta).toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {/* Silhouette Score Card */}
          <div className="bg-gradient-to-br from-cyan-50 to-white p-6 rounded-2xl border border-cyan-100 shadow-sm relative overflow-hidden">
             <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50"></div>
            <h3 className="text-cyan-600 text-xs font-bold uppercase tracking-wider mb-2">Silhouette Score</h3>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold text-slate-800 tabular-nums">
                {latestPoint ? latestPoint.silhouette.toFixed(3) : '---'}
              </span>
              <span className="text-xs font-bold text-cyan-500 bg-cyan-100 px-2 py-1 rounded-full">
                Target ~{Math.min(0.85, 0.3 + (kValue * 0.08)).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Iteration Card */}
          <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-2xl border border-purple-100 shadow-sm relative overflow-hidden">
             <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50"></div>
            <h3 className="text-purple-600 text-xs font-bold uppercase tracking-wider mb-2">Iteration</h3>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold text-slate-800 tabular-nums">
                {iterationCounter}
              </span>
              <span className="text-sm font-medium text-slate-400">
                epochs
              </span>
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="relative bg-white border-2 border-slate-50 rounded-2xl p-6 shadow-[inset_0_4px_20px_rgba(0,0,0,0.02)]">
          
          {/* Y-Axis Labels */}
          <div className="absolute left-6 top-6 bottom-6 w-12 flex flex-col justify-between text-xs font-bold text-slate-300">
            <span>{(maxInertia / 1000).toFixed(1)}k</span>
            <span>{((maxInertia + minInertia) / 2000).toFixed(1)}k</span>
            <span>{(minInertia / 1000).toFixed(1)}k</span>
          </div>

          <div className="ml-12 relative h-[300px] w-full overflow-hidden">
            <svg 
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} 
              preserveAspectRatio="none" 
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CANDY_COLORS.pink} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={CANDY_COLORS.pink} stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={CANDY_COLORS.purple} />
                  <stop offset="100%" stopColor={CANDY_COLORS.pink} />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1={Y_PADDING} x2={CHART_WIDTH} y2={Y_PADDING} stroke="#f1f5f9" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="0" y1={CHART_HEIGHT / 2} x2={CHART_WIDTH} y2={CHART_HEIGHT / 2} stroke="#f1f5f9" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="0" y1={CHART_HEIGHT - Y_PADDING} x2={CHART_WIDTH} y2={CHART_HEIGHT - Y_PADDING} stroke="#f1f5f9" strokeWidth="2" strokeDasharray="4 4" />

              {/* Data Area & Line */}
              {history.length > 1 && (
                <>
                  <path
                    d={areaPath}
                    fill="url(#areaGradient)"
                    className="transition-all duration-300 ease-linear"
                  />
                  <path
                    d={linePath}
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300 ease-linear drop-shadow-md"
                  />
                </>
              )}

              {/* Current Data Point Marker */}
              {latestPoint && (
                <g 
                  transform={`translate(${getX(history.length < MAX_HISTORY ? history.length - 1 : MAX_HISTORY - 1, history.length)}, ${getY(latestPoint.inertia)})`}
                  className="transition-all duration-300 ease-linear"
                >
                  <circle r="8" fill="white" stroke={CANDY_COLORS.pink} strokeWidth="3" className="drop-shadow-lg" />
                  <circle r="3" fill={CANDY_COLORS.pink} />
                  
                  {/* Tooltip-like label attached to the current point */}
                  <rect x="-30" y="-35" width="60" height="20" rx="4" fill="#1e293b" opacity="0.8" />
                  <text x="0" y="-21" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                    {latestPoint.inertia.toFixed(0)}
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}