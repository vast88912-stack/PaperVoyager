import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// --- Types ---
type Point = { x: number; y: number };
type ClusterAssignment = number; // Index of centroid
type Centroid = Point;

interface HistoryStep {
  centroids: Centroid[];
  assignments: ClusterAssignment[];
  inertia: number;
}

// --- Constants ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const CANDY_COLORS = [
  '#FFB3BA', // Pink
  '#BAE1FF', // Blue
  '#BAFFC9', // Green
  '#FFDFBA', // Orange
  '#E8BAFF', // Purple
  '#FFFFBA', // Yellow
  '#FFC4E1', // Magenta-ish
  '#C4FAF8', // Cyan-ish
];

// --- Helpers ---
const euclideanDistance = (p1: Point, p2: Point) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

export default function App() {
  // --- State ---
  const [k, setK] = useState<number>(4);
  const [points, setPoints] = useState<Point[]>([]);
  const [history, setHistory] = useState<HistoryStep[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(600); // ms per step

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Data Generation ---
  const generateData = useCallback((numClusters: number) => {
    const newPoints: Point[] = [];
    const numPointsPerCluster = 50;
    const padding = 50;

    // Generate random centers for blobs
    const trueCenters = Array.from({ length: numClusters }).map(() => ({
      x: padding + Math.random() * (CANVAS_WIDTH - padding * 2),
      y: padding + Math.random() * (CANVAS_HEIGHT - padding * 2),
    }));

    trueCenters.forEach((center) => {
      for (let i = 0; i < numPointsPerCluster; i++) {
        // Gaussian-ish scatter around true center
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
        
        const spread = 30; // standard deviation
        
        newPoints.push({
          x: Math.max(0, Math.min(CANVAS_WIDTH, center.x + z0 * spread)),
          y: Math.max(0, Math.min(CANVAS_HEIGHT, center.y + z1 * spread)),
        });
      }
    });

    setPoints(newPoints);
    return newPoints;
  }, []);

  // --- K-Means Algorithm (Computes full history upfront) ---
  const computeKMeansHistory = useCallback((data: Point[], kValue: number) => {
    if (data.length === 0) return;

    const localHistory: HistoryStep[] = [];
    
    // 1. Initialization (Random points from dataset)
    let centroids: Centroid[] = [];
    const shuffled = [...data].sort(() => 0.5 - Math.random());
    centroids = shuffled.slice(0, kValue).map(p => ({ ...p }));

    let assignments: ClusterAssignment[] = new Array(data.length).fill(-1);
    let hasChanged = true;
    let iterations = 0;
    const maxIterations = 30;

    while (hasChanged && iterations < maxIterations) {
      hasChanged = false;
      let currentInertia = 0;
      const newAssignments: ClusterAssignment[] = [];

      // Assignment Step
      for (let i = 0; i < data.length; i++) {
        const point = data[i];
        let minDist = Infinity;
        let closestCentroid = -1;

        for (let j = 0; j < kValue; j++) {
          const dist = Math.pow(euclideanDistance(point, centroids[j]), 2); // Squared distance for inertia
          if (dist < minDist) {
            minDist = dist;
            closestCentroid = j;
          }
        }
        newAssignments.push(closestCentroid);
        currentInertia += minDist;

        if (assignments[i] !== closestCentroid) {
          hasChanged = true;
        }
      }

      assignments = newAssignments;

      // Record step before updating centroids so we see the "drift" correctly
      // i.e., show centroids, then how points assign to them.
      localHistory.push({
        centroids: centroids.map(c => ({ ...c })),
        assignments: [...assignments],
        inertia: currentInertia,
      });

      // Update Step (calculate new centroids)
      const newCentroids: Centroid[] = Array.from({ length: kValue }).map(() => ({ x: 0, y: 0 }));
      const counts: number[] = new Array(kValue).fill(0);

      for (let i = 0; i < data.length; i++) {
        const clusterIdx = assignments[i];
        newCentroids[clusterIdx].x += data[i].x;
        newCentroids[clusterIdx].y += data[i].y;
        counts[clusterIdx]++;
      }

      for (let j = 0; j < kValue; j++) {
        if (counts[j] > 0) {
          newCentroids[j].x /= counts[j];
          newCentroids[j].y /= counts[j];
        } else {
          // Handle empty cluster: reinitialize to random point
          const randomPoint = data[Math.floor(Math.random() * data.length)];
          newCentroids[j] = { ...randomPoint };
          hasChanged = true; // Force another iteration
        }
      }
      centroids = newCentroids;
      iterations++;
    }

    setHistory(localHistory);
    setCurrentStep(0);
    setIsPlaying(true); // Auto-play on generation
  }, []);

  // --- Initial Setup & Re-run on K change ---
  useEffect(() => {
    setIsPlaying(false);
    const pts = generateData(k);
    computeKMeansHistory(pts, k);
  }, [k, generateData, computeKMeansHistory]);

  // --- Playback Loop ---
  useEffect(() => {
    if (isPlaying && history.length > 0) {
      timerRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= history.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, history.length, playbackSpeed]);

  // --- Event Handlers ---
  const handlePlayPause = () => {
    if (currentStep >= history.length - 1) {
      setCurrentStep(0); // Rewind and play if at end
    }
    setIsPlaying(!isPlaying);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    if (currentStep < history.length - 1) setCurrentStep(currentStep + 1);
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleReset = () => {
    setIsPlaying(false);
    const pts = generateData(k);
    computeKMeansHistory(pts, k);
  };

  // --- Render Helpers ---
  const currentData = history[currentStep] || { centroids: [], assignments: [], inertia: 0 };
  const isConverged = currentStep === history.length - 1 && history.length > 0;

  // Generate paths for centroid trails
  const centroidTrails = useMemo(() => {
    if (history.length === 0) return [];
    
    return Array.from({ length: k }).map((_, clusterIdx) => {
      const pathPoints = history.slice(0, currentStep + 1).map(step => {
        const c = step.centroids[clusterIdx];
        return `${c.x},${c.y}`;
      }).join(' L ');
      return `M ${pathPoints}`;
    });
  }, [history, currentStep, k]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 selection:bg-pink-200">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              <span className="bg-gradient-to-br from-pink-400 to-orange-400 w-8 h-8 rounded-full shadow-inner inline-block"></span>
              Centroid Drift
            </h1>
            <p className="text-slate-500 mt-1 font-medium">Watch K-Means converge step-by-step</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
             <div className="px-4 py-2 flex flex-col items-center justify-center border-r border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Iteration</span>
                <span className="text-xl font-mono font-bold text-slate-700">{currentStep} <span className="text-sm text-slate-400 font-normal">/ {Math.max(0, history.length - 1)}</span></span>
             </div>
             <div className="px-4 py-2 flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inertia</span>
                <span className="text-xl font-mono font-bold text-slate-700">{Math.round(currentData.inertia).toLocaleString()}</span>
             </div>
          </div>
        </header>

        {/* Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Hyperparameters</h2>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-700">Clusters (k)</label>
                    <span className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{k}</span>
                  </div>
                  <input 
                    type="range" 
                    min="2" 
                    max="8" 
                    value={k} 
                    onChange={(e) => setK(parseInt(e.target.value))}
                    className="w-full accent-pink-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-700">Animation Speed</label>
                  </div>
                  <div className="flex gap-2">
                    {[1000, 600, 200].map((speed, idx) => (
                      <button
                        key={speed}
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                          playbackSpeed === speed 
                            ? 'bg-slate-800 text-white' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {idx === 0 ? 'Slow' : idx === 1 ? 'Norm' : 'Fast'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
               <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Playback</h2>
               <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <button 
                      onClick={handleStepBack} 
                      disabled={currentStep === 0}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-slate-700 font-bold transition-all active:scale-95"
                    >
                      &larr; Step
                    </button>
                    <button 
                      onClick={handlePlayPause}
                      className={`flex-[2] py-2 rounded-lg font-bold text-white transition-all active:scale-95 shadow-sm ${
                        isPlaying ? 'bg-orange-400 hover:bg-orange-500' : 'bg-pink-500 hover:bg-pink-600'
                      }`}
                    >
                      {isPlaying ? 'Pause' : (currentStep >= history.length - 1 ? 'Replay' : 'Play Drift')}
                    </button>
                    <button 
                      onClick={handleStepForward} 
                      disabled={currentStep >= history.length - 1}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-slate-700 font-bold transition-all active:scale-95"
                    >
                      Step &rarr;
                    </button>
                  </div>
                  
                  <button 
                    onClick={handleReset}
                    className="w-full py-2 bg-white border-2 border-slate-200 hover:border-slate-300 rounded-lg text-slate-600 font-bold transition-all active:scale-95 mt-2"
                  >
                    Generate New Data
                  </button>
               </div>
            </div>

            {isConverged && (
              <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 text-sm font-medium flex items-center gap-2 animate-pulse">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Algorithm Converged
              </div>
            )}
          </div>

          {/* Canvas Area */}
          <div className="lg:col-span-3 relative bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center p-4 min-h-[500px]">
            {/* Soft grid background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            <svg 
              width="100%" 
              height="100%" 
              viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} 
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full max-h-[600px] drop-shadow-sm"
            >
              {/* Render Points */}
              {points.map((p, i) => {
                const clusterIdx = currentData.assignments[i];
                const color = clusterIdx >= 0 ? CANDY_COLORS[clusterIdx % CANDY_COLORS.length] : '#e2e8f0'; // slate-200 if unassigned
                return (
                  <circle
                    key={`p-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={4}
                    fill={color}
                    className="transition-colors duration-300 ease-in-out"
                    opacity={0.8}
                  />
                );
              })}

              {/* Render Centroid Trails (Drift) */}
              {centroidTrails.map((pathData, idx) => (
                <path
                  key={`trail-${idx}`}
                  d={pathData}
                  fill="none"
                  stroke={CANDY_COLORS[idx % CANDY_COLORS.length]}
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  opacity={0.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
              ))}

              {/* Render Current Centroids */}
              {currentData.centroids.map((c, i) => (
                <g key={`c-${i}`} className="transition-all duration-500 ease-out" style={{ transform: `translate(${c.x}px, ${c.y}px)` }}>
                  {/* Outer glow/ring */}
                  <circle
                    cx={0}
                    cy={0}
                    r={16}
                    fill="transparent"
                    stroke={CANDY_COLORS[i % CANDY_COLORS.length]}
                    strokeWidth="3"
                    opacity={0.5}
                    className={`${isPlaying ? 'animate-ping' : ''}`}
                    style={{ animationDuration: '1.5s' }}
                  />
                  {/* Inner solid star-like or distinct shape - let's use a heavily stroked circle */}
                  <circle
                    cx={0}
                    cy={0}
                    r={8}
                    fill="#fff"
                    stroke={CANDY_COLORS[i % CANDY_COLORS.length]}
                    strokeWidth="5"
                    className="drop-shadow-md"
                  />
                  {/* Center dot */}
                  <circle
                    cx={0}
                    cy={0}
                    r={2}
                    fill="#1e293b" // slate-800
                  />
                </g>
              ))}
            </svg>
          </div>

        </div>
      </div>
    </div>
  );
}