import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Constants & Types ---

const MAX_ITERATIONS = 50;
const MAX_INERTIA = 10000;
const CHART_WIDTH = 800;
const CHART_HEIGHT = 400;

type AlgorithmId = 'kmeans' | 'kmedoids' | 'minibatch' | 'gmm';

interface AlgorithmConfig {
  id: AlgorithmId;
  name: string;
  color: string;
  baseDecay: number;
  noiseLevel: number;
  asymptote: number;
}

const ALGORITHMS: Record<AlgorithmId, AlgorithmConfig> = {
  kmeans: { id: 'kmeans', name: 'K-Means', color: '#FF499E', baseDecay: 0.65, noiseLevel: 0, asymptote: 1200 },
  kmedoids: { id: 'kmedoids', name: 'K-Medoids', color: '#00E5FF', baseDecay: 0.75, noiseLevel: 20, asymptote: 1500 },
  minibatch: { id: 'minibatch', name: 'MiniBatch', color: '#FFD166', baseDecay: 0.60, noiseLevel: 400, asymptote: 1800 },
  gmm: { id: 'gmm', name: 'GMM (Equivalent)', color: '#A06CD5', baseDecay: 0.85, noiseLevel: 5, asymptote: 900 },
};

interface DataPoint {
  iteration: number;
  kmeans: number;
  kmedoids: number;
  minibatch: number;
  gmm: number;
}

// --- Helper Functions ---

const generateInitialData = (): DataPoint => ({
  iteration: 0,
  kmeans: MAX_INERTIA,
  kmedoids: MAX_INERTIA,
  minibatch: MAX_INERTIA,
  gmm: MAX_INERTIA,
});

const calculateNextValue = (prev: number, config: AlgorithmConfig, batchSizeMultiplier: number = 1): number => {
  const noise = (Math.random() - 0.5) * config.noiseLevel * batchSizeMultiplier;
  let next = (prev - config.asymptote) * config.baseDecay + config.asymptote + noise;
  // Add occasional spikes for minibatch to simulate escaping local minima
  if (config.id === 'minibatch' && Math.random() > 0.8) {
    next += Math.random() * 800 * batchSizeMultiplier;
  }
  return Math.max(config.asymptote * 0.9, Math.min(MAX_INERTIA, next));
};

// --- Main Component ---

export default function App() {
  const [data, setData] = useState<DataPoint[]>([generateInitialData()]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeAlgs, setActiveAlgs] = useState<Set<AlgorithmId>>(
    new Set(['kmeans', 'kmedoids', 'minibatch', 'gmm'])
  );
  const [batchSize, setBatchSize] = useState<number>(128);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(150);

  // Simulation Loop
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setData((prevData) => {
        const last = prevData[prevData.length - 1];
        
        if (last.iteration >= MAX_ITERATIONS) {
          setIsRunning(false);
          return prevData;
        }

        const batchMultiplier = batchSize === 32 ? 2 : batchSize === 256 ? 0.5 : 1;

        const nextPoint: DataPoint = {
          iteration: last.iteration + 1,
          kmeans: calculateNextValue(last.kmeans, ALGORITHMS.kmeans),
          kmedoids: calculateNextValue(last.kmedoids, ALGORITHMS.kmedoids),
          minibatch: calculateNextValue(last.minibatch, ALGORITHMS.minibatch, batchMultiplier),
          gmm: calculateNextValue(last.gmm, ALGORITHMS.gmm),
        };

        return [...prevData, nextPoint];
      });
    }, playbackSpeed);

    return () => clearInterval(timer);
  }, [isRunning, batchSize, playbackSpeed]);

  // Handlers
  const toggleAlgorithm = (id: AlgorithmId) => {
    setActiveAlgs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleReset = () => {
    setIsRunning(false);
    setData([generateInitialData()]);
  };

  // Derived Stats
  const currentData = data[data.length - 1];
  const progressPercent = (currentData.iteration / MAX_ITERATIONS) * 100;
  
  // Mock Silhouette Score based on lowest active inertia
  const currentLowestInertia = Math.min(
    ...Array.from(activeAlgs).map(alg => currentData[alg] || MAX_INERTIA)
  );
  const mockSilhouette = useMemo(() => {
    if (currentData.iteration === 0) return 0.12;
    const base = 0.85 - (currentLowestInertia / MAX_INERTIA) * 0.7;
    return Math.max(-1, Math.min(1, base + (Math.random() * 0.02 - 0.01)));
  }, [currentLowestInertia, currentData.iteration]);

  // SVG Path Generator
  const createPath = (algId: AlgorithmId) => {
    if (data.length === 0) return '';
    return data
      .map((d, i) => {
        const x = (d.iteration / MAX_ITERATIONS) * CHART_WIDTH;
        const y = CHART_HEIGHT - (d[algId] / MAX_INERTIA) * CHART_HEIGHT;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800 selection:bg-pink-200">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100">
        
        {/* Header Section */}
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-br from-white to-slate-50/50">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF499E] to-[#A06CD5]">
                Live Inertia Chart
              </span>
              <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-500 rounded-full">
                Module 4
              </span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium">
              Real-time convergence tracking across clustering algorithms.
            </p>
          </div>

          {/* Silhouette Badge */}
          <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Silhouette Score</span>
              <span className="text-2xl font-black text-slate-800 tabular-nums">
                {mockSilhouette.toFixed(3)}
              </span>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" 
                 style={{ backgroundColor: mockSilhouette > 0.6 ? '#E8FDF5' : mockSilhouette > 0.4 ? '#FFF9E6' : '#FFEBF4' }}>
              <svg className="w-6 h-6" style={{ color: mockSilhouette > 0.6 ? '#00E5FF' : mockSilhouette > 0.4 ? '#FFD166' : '#FF499E' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                {mockSilhouette > 0.5 ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Controls Sidebar */}
          <div className="lg:col-span-1 flex flex-col gap-8">
            
            {/* Playback Controls */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Simulation</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  disabled={currentData.iteration >= MAX_ITERATIONS}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    currentData.iteration >= MAX_ITERATIONS 
                      ? 'bg-slate-300 cursor-not-allowed'
                      : isRunning 
                        ? 'bg-slate-800 hover:bg-slate-700 shadow-lg shadow-slate-800/20' 
                        : 'bg-[#FF499E] hover:bg-[#e63e8d] shadow-lg shadow-[#FF499E]/30'
                  }`}
                >
                  {isRunning ? (
                    <><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg> Pause</>
                  ) : (
                    <><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg> Run</>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
                  title="Reset"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              
              {/* Progress Bar */}
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-2">
                <div 
                  className="h-full bg-slate-800 transition-all duration-200 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-xs text-slate-400 text-right font-medium tabular-nums">
                Iteration {currentData.iteration} / {MAX_ITERATIONS}
              </div>
            </div>

            {/* Algorithm Toggles */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Algorithms</h3>
              <div className="flex flex-col gap-2">
                {(Object.values(ALGORITHMS) as AlgorithmConfig[]).map((alg) => {
                  const isActive = activeAlgs.has(alg.id);
                  const currentValue = currentData[alg.id];
                  return (
                    <button
                      key={alg.id}
                      onClick={() => toggleAlgorithm(alg.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${
                        isActive 
                          ? 'border-transparent bg-slate-50 shadow-sm' 
                          : 'border-slate-100 bg-transparent opacity-50 hover:opacity-80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full shadow-inner"
                          style={{ backgroundColor: isActive ? alg.color : '#cbd5e1' }}
                        />
                        <span className={`font-bold ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                          {alg.name}
                        </span>
                      </div>
                      {isActive && (
                        <span className="text-xs font-black tabular-nums" style={{ color: alg.color }}>
                          {Math.round(currentValue)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Advanced</h3>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 flex justify-between">
                  <span>Mini-Batch Size</span>
                  <span className="text-slate-800">{batchSize}</span>
                </label>
                <input 
                  type="range" 
                  min="32" 
                  max="256" 
                  step="32"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full accent-[#FFD166]"
                />
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <label className="text-xs font-bold text-slate-500 flex justify-between">
                  <span>Animation Speed</span>
                  <span className="text-slate-800">{playbackSpeed}ms</span>
                </label>
                <input 
                  type="range" 
                  min="50" 
                  max="500" 
                  step="50"
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="w-full accent-slate-400"
                  style={{ direction: 'rtl' }} // Faster = lower ms = right side
                />
              </div>
            </div>

          </div>

          {/* Chart Area */}
          <div className="lg:col-span-3 bg-white border-2 border-slate-100 rounded-3xl p-6 relative flex flex-col">
            <h2 className="text-lg font-extrabold text-slate-800 mb-6 absolute top-6 left-6 z-10">
              Inertia vs. Iterations
            </h2>
            
            <div className="flex-1 relative w-full h-full min-h-[400px] mt-8">
              {/* Y-Axis Labels */}
              <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs font-bold text-slate-300 tabular-nums">
                <span>10k</span>
                <span>7.5k</span>
                <span>5k</span>
                <span>2.5k</span>
                <span>0</span>
              </div>

              {/* Chart SVG Container */}
              <div className="absolute left-12 right-0 top-0 bottom-8">
                <svg 
                  viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} 
                  preserveAspectRatio="none"
                  className="w-full h-full overflow-visible"
                >
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                    <line 
                      key={`grid-y-${ratio}`}
                      x1="0" y1={CHART_HEIGHT * ratio} 
                      x2={CHART_WIDTH} y2={CHART_HEIGHT * ratio} 
                      stroke="#f1f5f9" strokeWidth="2" strokeDasharray="4 4"
                    />
                  ))}
                  {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => (
                    <line 
                      key={`grid-x-${ratio}`}
                      x1={CHART_WIDTH * ratio} y1="0" 
                      x2={CHART_WIDTH * ratio} y2={CHART_HEIGHT} 
                      stroke="#f1f5f9" strokeWidth="2" strokeDasharray="4 4"
                    />
                  ))}

                  {/* Data Lines */}
                  {(Object.values(ALGORITHMS) as AlgorithmConfig[]).map((alg) => {
                    if (!activeAlgs.has(alg.id)) return null;
                    const pathData = createPath(alg.id);
                    const currentY = CHART_HEIGHT - (currentData[alg.id] / MAX_INERTIA) * CHART_HEIGHT;
                    const currentX = (currentData.iteration / MAX_ITERATIONS) * CHART_WIDTH;
                    
                    return (
                      <g key={`line-${alg.id}`}>
                        {/* Glow/Shadow */}
                        <path 
                          d={pathData} 
                          fill="none" 
                          stroke={alg.color} 
                          strokeWidth="8" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          className="opacity-20 blur-sm transition-all duration-300"
                        />
                        {/* Main Line */}
                        <path 
                          d={pathData} 
                          fill="none" 
                          stroke={alg.color} 
                          strokeWidth="4" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          className="transition-all duration-300 drop-shadow-sm"
                        />
                        {/* End Point Indicator */}
                        {data.length > 0 && (
                          <circle 
                            cx={currentX} 
                            cy={currentY} 
                            r="6" 
                            fill="white" 
                            stroke={alg.color} 
                            strokeWidth="3"
                            className="transition-all duration-300 shadow-lg"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* X-Axis Labels */}
              <div className="absolute left-12 right-0 bottom-0 h-8 flex justify-between items-end text-xs font-bold text-slate-300 tabular-nums">
                <span>0</span>
                <span>10</span>
                <span>20</span>
                <span>30</span>
                <span>40</span>
                <span>50</span>
              </div>
            </div>
            
            {/* Empty State Overlay */}
            {data.length === 1 && !isRunning && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-3xl z-20">
                <div className="bg-white px-6 py-4 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center text-[#FF499E]">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <p className="text-slate-800 font-bold">Ready to track inertia</p>
                  <button 
                    onClick={() => setIsRunning(true)}
                    className="text-sm font-bold text-[#FF499E] hover:text-[#e63e8d] transition-colors"
                  >
                    Click Run to start simulation
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}