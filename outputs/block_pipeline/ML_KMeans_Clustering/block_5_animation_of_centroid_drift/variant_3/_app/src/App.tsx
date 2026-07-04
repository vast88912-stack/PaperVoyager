import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- Constants & Candy Theme Colors ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const POINT_RADIUS = 4;
const CENTROID_RADIUS = 10;

const CANDY_COLORS = [
  '#FF9AA2', // Melon
  '#FFDAC1', // Peach
  '#E2F0CB', // Mint
  '#B5EAD7', // Seafoam
  '#C7CEEA', // Periwinkle
  '#F1CBFF', // Lilac
  '#FFF5BA', // Lemon
  '#FFB7B2', // Coral
];

const DARK_CANDY_COLORS = [
  '#E05C6C', 
  '#E0A87A', 
  '#A8C683', 
  '#74BFA1', 
  '#8B96C6', 
  '#C988E0', 
  '#D9C96A', 
  '#E07872', 
];

// --- Types ---
type Point = {
  id: number;
  x: number;
  y: number;
  clusterId: number | null;
};

type Centroid = {
  id: number;
  x: number;
  y: number;
  history: { x: number; y: number }[];
};

// --- Helper Functions ---
const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

// Box-Muller transform for normal distribution
const randomNormal = (mean: number, stdDev: number) => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdDev + mean;
};

export default function App() {
  // --- State ---
  const [k, setK] = useState<number>(3);
  const [points, setPoints] = useState<Point[]>([]);
  const [centroids, setCentroids] = useState<Centroid[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [iteration, setIteration] = useState<number>(0);
  const [inertia, setInertia] = useState<number>(0);
  const [hasConverged, setHasConverged] = useState<boolean>(false);
  
  const animationRef = useRef<number | null>(null);

  // --- Data Generation ---
  const generateData = useCallback(() => {
    const numBlobs = 4;
    const pointsPerBlob = 75;
    const newPoints: Point[] = [];
    let pointId = 0;

    const centers = [
      { x: CANVAS_WIDTH * 0.2, y: CANVAS_HEIGHT * 0.2 },
      { x: CANVAS_WIDTH * 0.8, y: CANVAS_HEIGHT * 0.2 },
      { x: CANVAS_WIDTH * 0.3, y: CANVAS_HEIGHT * 0.7 },
      { x: CANVAS_WIDTH * 0.7, y: CANVAS_HEIGHT * 0.8 },
    ];

    centers.forEach(center => {
      for (let i = 0; i < pointsPerBlob; i++) {
        newPoints.push({
          id: pointId++,
          x: Math.max(0, Math.min(CANVAS_WIDTH, randomNormal(center.x, 40))),
          y: Math.max(0, Math.min(CANVAS_HEIGHT, randomNormal(center.y, 40))),
          clusterId: null,
        });
      }
    });

    // Add some noise
    for (let i = 0; i < 30; i++) {
      newPoints.push({
        id: pointId++,
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        clusterId: null,
      });
    }

    setPoints(newPoints);
    return newPoints;
  }, []);

  // --- Initialization ---
  const initializeAlgorithm = useCallback((pts: Point[] = points, currentK: number = k) => {
    setIsPlaying(false);
    setIteration(0);
    setHasConverged(false);
    setInertia(0);

    // Random initialization for centroids to ensure noticeable drift
    const initialCentroids: Centroid[] = [];
    for (let i = 0; i < currentK; i++) {
      const x = Math.random() * (CANVAS_WIDTH - 100) + 50;
      const y = Math.random() * (CANVAS_HEIGHT - 100) + 50;
      initialCentroids.push({
        id: i,
        x,
        y,
        history: [{ x, y }] // Start history
      });
    }

    setCentroids(initialCentroids);
    
    // Reset point clusters
    setPoints(pts.map(p => ({ ...p, clusterId: null })));
  }, [points, k]);

  // Initial load
  useEffect(() => {
    const pts = generateData();
    initializeAlgorithm(pts, k);
  }, [generateData, initializeAlgorithm, k]);

  // --- Lloyd's Algorithm Step ---
  const performStep = useCallback(() => {
    if (hasConverged || centroids.length === 0) return;

    let currentInertia = 0;
    let moved = false;

    // 1. Assignment Step
    const newPoints = points.map(point => {
      let minDistance = Infinity;
      let closestCentroidId = -1;

      centroids.forEach(centroid => {
        const dist = calculateDistance(point, centroid);
        if (dist < minDistance) {
          minDistance = dist;
          closestCentroidId = centroid.id;
        }
      });

      currentInertia += Math.pow(minDistance, 2);
      return { ...point, clusterId: closestCentroidId };
    });

    // 2. Update Step (Calculate new means)
    const newCentroids = centroids.map(centroid => {
      const assignedPoints = newPoints.filter(p => p.clusterId === centroid.id);
      
      if (assignedPoints.length === 0) {
        // If empty, keep it where it is or re-initialize (keeping it simple here)
        return centroid;
      }

      const sumX = assignedPoints.reduce((sum, p) => sum + p.x, 0);
      const sumY = assignedPoints.reduce((sum, p) => sum + p.y, 0);
      const meanX = sumX / assignedPoints.length;
      const meanY = sumY / assignedPoints.length;

      // Check if it moved significantly
      if (Math.abs(centroid.x - meanX) > 0.1 || Math.abs(centroid.y - meanY) > 0.1) {
        moved = true;
      }

      return {
        ...centroid,
        x: meanX,
        y: meanY,
        history: [...centroid.history, { x: meanX, y: meanY }] // Append to history for drift trail
      };
    });

    setPoints(newPoints);
    setCentroids(newCentroids);
    setInertia(currentInertia);
    setIteration(prev => prev + 1);
    
    if (!moved) {
      setHasConverged(true);
      setIsPlaying(false);
    }
  }, [centroids, points, hasConverged]);

  // --- Animation Loop ---
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        performStep();
      }, 800); // 800ms gives time to see the CSS transition drift
      return () => clearInterval(interval);
    }
  }, [isPlaying, performStep]);

  // --- Handlers ---
  const handleGenerateData = () => {
    const pts = generateData();
    initializeAlgorithm(pts, k);
  };

  const handleKChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newK = parseInt(e.target.value, 10);
    setK(newK);
    initializeAlgorithm(points, newK);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 font-sans text-slate-800 selection:bg-pink-200">
      
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          Centroid <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">Drift Dynamics</span>
        </h1>
        <p className="text-slate-500 font-medium">Observe the path of K-Means optimization in real-time.</p>
      </header>

      {/* Main Container */}
      <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col lg:flex-row gap-8 w-full max-w-6xl">
        
        {/* Left Panel: Visualization */}
        <div className="flex-1 relative rounded-2xl overflow-hidden bg-slate-50/50 border border-slate-100">
          <svg 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT} 
            className="w-full h-auto drop-shadow-sm" 
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          >
            {/* Draw Points */}
            {points.map(point => (
              <circle
                key={`p-${point.id}`}
                cx={point.x}
                cy={point.y}
                r={POINT_RADIUS}
                fill={point.clusterId !== null ? CANDY_COLORS[point.clusterId % CANDY_COLORS.length] : '#CBD5E1'}
                opacity={point.clusterId !== null ? 0.8 : 0.4}
                className="transition-colors duration-500"
              />
            ))}

            {/* Draw Centroid Drift Trails */}
            {centroids.map(centroid => {
              if (centroid.history.length < 2) return null;
              const pathData = centroid.history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${h.x} ${h.y}`).join(' ');
              const color = DARK_CANDY_COLORS[centroid.id % DARK_CANDY_COLORS.length];
              
              return (
                <g key={`trail-${centroid.id}`}>
                  {/* Outer subtle glow for the path */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    opacity="0.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Core dashed drift line */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeDasharray="6 6"
                    opacity="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-pulse"
                  />
                  {/* Small dots at historical positions */}
                  {centroid.history.slice(0, -1).map((h, i) => (
                     <circle 
                        key={`h-${centroid.id}-${i}`} 
                        cx={h.x} cy={h.y} 
                        r="3" 
                        fill={color} 
                        opacity="0.5" 
                      />
                  ))}
                </g>
              );
            })}

            {/* Draw Current Centroids */}
            {centroids.map(centroid => {
              const color = DARK_CANDY_COLORS[centroid.id % DARK_CANDY_COLORS.length];
              const lightColor = CANDY_COLORS[centroid.id % CANDY_COLORS.length];
              return (
                <g 
                  key={`c-${centroid.id}`}
                  className="transition-all duration-700 ease-in-out"
                  style={{ transform: `translate(${centroid.x}px, ${centroid.y}px)` }}
                >
                  {/* Halo */}
                  <circle
                    cx={0} cy={0}
                    r={CENTROID_RADIUS * 2.5}
                    fill={lightColor}
                    opacity="0.3"
                    className={isPlaying ? "animate-ping" : ""}
                    style={{ animationDuration: '1.5s' }}
                  />
                  {/* Core Centroid */}
                  <circle
                    cx={0} cy={0}
                    r={CENTROID_RADIUS}
                    fill={color}
                    stroke="#fff"
                    strokeWidth="3"
                    className="shadow-lg drop-shadow-md"
                  />
                  {/* Centroid ID or Cross */}
                  <path d="M-4,0 L4,0 M0,-4 L0,4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </g>
              );
            })}
          </svg>

          {/* Convergence Overlay */}
          {hasConverged && (
            <div className="absolute top-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold shadow-sm border border-green-200 animate-bounce">
              Converged!
            </div>
          )}
        </div>

        {/* Right Panel: Controls */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          
          {/* Status Card */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Simulation Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <div className="text-[10px] text-slate-500 font-semibold mb-1">ITERATION</div>
                <div className="text-2xl font-mono text-slate-800">{iteration}</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <div className="text-[10px] text-slate-500 font-semibold mb-1">INERTIA</div>
                <div className="text-xl font-mono text-slate-800 truncate" title={inertia.toFixed(0)}>
                  {inertia === 0 ? '-' : (inertia / 1000).toFixed(1) + 'k'}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-5">
            
            {/* K Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-slate-700">Number of Clusters (k)</label>
                <span className="bg-pink-100 text-pink-700 font-mono text-xs px-2 py-1 rounded-md">{k}</span>
              </div>
              <input
                type="range"
                min="2"
                max="8"
                value={k}
                onChange={handleKChange}
                disabled={isPlaying}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-500 disabled:opacity-50"
              />
            </div>

            <hr className="border-slate-100" />

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={hasConverged}
                className={`col-span-2 py-3 px-4 rounded-xl font-bold text-white shadow-sm transition-all flex justify-center items-center gap-2 ${
                  hasConverged 
                    ? 'bg-slate-300 cursor-not-allowed'
                    : isPlaying 
                      ? 'bg-amber-400 hover:bg-amber-500 active:bg-amber-600' 
                      : 'bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700'
                }`}
              >
                {isPlaying ? (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    Pause Drift
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                    {iteration === 0 ? 'Start Drift' : 'Resume'}
                  </>
                )}
              </button>

              <button
                onClick={performStep}
                disabled={isPlaying || hasConverged}
                className="py-2 px-4 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Step Forward
              </button>
              
              <button
                onClick={() => initializeAlgorithm(points, k)}
                className="py-2 px-4 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl shadow-sm transition-colors text-sm"
              >
                Reset Centers
              </button>
            </div>

            <button
              onClick={handleGenerateData}
              disabled={isPlaying}
              className="mt-2 py-2 px-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              New Dataset
            </button>
            
          </div>
          
          {/* Description */}
          <div className="mt-auto p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-sm text-blue-800 leading-relaxed">
            <strong className="font-semibold block mb-1">Visualizing the Drift</strong>
            Watch as centroids iteratively compute the mean of their assigned points and physically move (drift) across the feature space, leaving a dashed trail of their history until convergence is reached.
          </div>
        </div>
      </div>
    </div>
  );
}