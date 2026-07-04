import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

type Point = { x: number; y: number };
type InitMethod = 'random' | 'kmeans++' | 'farthest';

const CANDY_COLORS = [
  '#FF5E8E', // Pink
  '#42D9C8', // Cyan
  '#FFD166', // Yellow
  '#B07DFF', // Purple
  '#FF9F1C', // Orange
  '#06D6A0', // Mint
  '#EF476F', // Watermelon
];

// Helper: Euclidean distance
const getDistance = (p1: Point, p2: Point) =>
  Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

// Helper: Generate synthetic blob data
const generateBlobs = (numBlobs: number, pointsPerBlob: number, width: number, height: number): Point[] => {
  const points: Point[] = [];
  const centers: Point[] = [];
  
  for (let i = 0; i < numBlobs; i++) {
    centers.push({
      x: width * 0.15 + Math.random() * (width * 0.7),
      y: height * 0.15 + Math.random() * (height * 0.7),
    });
  }

  centers.forEach(center => {
    for (let i = 0; i < pointsPerBlob; i++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
      
      const spread = Math.min(width, height) * 0.08;
      
      points.push({
        x: Math.max(10, Math.min(width - 10, center.x + z0 * spread)),
        y: Math.max(10, Math.min(height - 10, center.y + z1 * spread)),
      });
    }
  });
  return points;
};

// --- Initialization Algorithms ---

const initRandom = (data: Point[], k: number): Point[] => {
  const shuffled = [...data].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, k);
};

const initKMeansPlusPlus = (data: Point[], k: number): Point[] => {
  if (data.length === 0) return [];
  const centers = [data[Math.floor(Math.random() * data.length)]];
  
  for (let i = 1; i < k; i++) {
    const distances = data.map(p => {
      const minDist = Math.min(...centers.map(c => getDistance(p, c)));
      return minDist * minDist; // Proportional to D(x)^2
    });
    
    const sumDist = distances.reduce((a, b) => a + b, 0);
    let rand = Math.random() * sumDist;
    let nextCenterIndex = data.length - 1;
    
    for (let j = 0; j < distances.length; j++) {
      rand -= distances[j];
      if (rand <= 0) {
        nextCenterIndex = j;
        break;
      }
    }
    centers.push(data[nextCenterIndex]);
  }
  return centers;
};

const initFarthest = (data: Point[], k: number): Point[] => {
  if (data.length === 0) return [];
  const centers = [data[Math.floor(Math.random() * data.length)]];
  
  for (let i = 1; i < k; i++) {
    let maxMinDist = -1;
    let nextCenterIndex = 0;
    
    data.forEach((p, index) => {
      const minDist = Math.min(...centers.map(c => getDistance(p, c)));
      if (minDist > maxMinDist) {
        maxMinDist = minDist;
        nextCenterIndex = index;
      }
    });
    centers.push(data[nextCenterIndex]);
  }
  return centers;
};

export default function App() {
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 500;
  
  const [data, setData] = useState<Point[]>([]);
  const [k, setK] = useState<number>(4);
  const [method, setMethod] = useState<InitMethod>('kmeans++');
  const [centroids, setCentroids] = useState<Point[]>([]);
  const [assignments, setAssignments] = useState<number[]>([]);
  const [trigger, setTrigger] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Generate initial dataset
  useEffect(() => {
    setData(generateBlobs(5, 60, CANVAS_WIDTH, CANVAS_HEIGHT));
  }, []);

  // Run Initialization
  useEffect(() => {
    if (data.length === 0) return;
    setIsAnimating(true);
    
    let newCentroids: Point[] = [];
    switch (method) {
      case 'random':
        newCentroids = initRandom(data, k);
        break;
      case 'kmeans++':
        newCentroids = initKMeansPlusPlus(data, k);
        break;
      case 'farthest':
        newCentroids = initFarthest(data, k);
        break;
    }
    
    setCentroids(newCentroids);
    
    // Assign points to nearest centroid for visual feedback of the initial state
    const newAssignments = data.map(p => {
      let minDist = Infinity;
      let closestIdx = -1;
      newCentroids.forEach((c, idx) => {
        const d = getDistance(p, c);
        if (d < minDist) {
          minDist = d;
          closestIdx = idx;
        }
      });
      return closestIdx;
    });
    
    setAssignments(newAssignments);
    
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [data, k, method, trigger]);

  const handleRegenerateData = () => {
    setData(generateBlobs(Math.floor(Math.random() * 4) + 3, 60, CANVAS_WIDTH, CANVAS_HEIGHT));
  };

  const methodDescriptions = {
    'random': 'Picks K random points from the dataset. Fast, but can lead to poor clusters if initial points are grouped together.',
    'kmeans++': 'Picks the first point randomly, then selects subsequent points with probability proportional to the squared distance from the nearest existing center. Balances spread and density.',
    'farthest': 'Picks the first point randomly, then strictly chooses the point that is farthest away from all existing centers (Maximin). Highly sensitive to outliers.'
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center py-10 px-4">
      
      <div className="w-full max-w-5xl mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          Initialization Playground
        </h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Explore how different initialization strategies pick starting centroids. 
          The initial placement heavily influences the speed of convergence and the final quality of clustering algorithms like K-Means.
        </p>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Controls Sidebar */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-8">
          
          {/* K Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Number of Clusters (K)</label>
              <span className="bg-slate-100 text-slate-700 py-1 px-3 rounded-full text-sm font-bold">{k}</span>
            </div>
            <input 
              type="range" 
              min="2" max="7" 
              value={k} 
              onChange={(e) => setK(parseInt(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          {/* Method Selector */}
          <div>
            <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider block mb-3">Initialization Method</label>
            <div className="flex flex-col gap-2">
              {(['random', 'kmeans++', 'farthest'] as InitMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`px-4 py-3 rounded-xl text-left transition-all duration-200 border-2 ${
                    method === m 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium shadow-sm' 
                    : 'border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {m === 'random' && '🎲 Random (Forgy)'}
                  {m === 'kmeans++' && '✨ K-Means++'}
                  {m === 'farthest' && '🎯 Farthest Point'}
                </button>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50">
            <p className="text-sm text-blue-800 leading-relaxed">
              {methodDescriptions[method]}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-auto flex flex-col gap-3">
             <button 
              onClick={() => setTrigger(t => t + 1)}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v6h6"></path></svg>
              Re-roll Initialization
            </button>
            <button 
              onClick={handleRegenerateData}
              className="w-full py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              New Dataset
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative group">
          
          {/* Legend Overlay */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-sm border border-slate-100 flex items-center gap-4 text-xs font-medium text-slate-600 z-10">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-300"></div>
              Data Point
            </div>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-slate-800"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              Initial Centroid
            </div>
          </div>

          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            className="block w-full h-auto bg-[#fafafa]"
            style={{ minHeight: '400px' }}
          >
            {/* Grid Lines */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Data Points */}
            {data.map((point, i) => {
              const assignedCentroidIdx = assignments[i];
              const color = assignedCentroidIdx !== undefined && assignedCentroidIdx >= 0 
                ? CANDY_COLORS[assignedCentroidIdx % CANDY_COLORS.length] 
                : '#cbd5e1'; // slate-300 fallback
              
              return (
                <circle
                  key={`pt-${i}`}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill={color}
                  opacity="0.6"
                  className="transition-colors duration-500 ease-in-out"
                />
              );
            })}

            {/* Connecting lines from points to assigned centroids (optional subtle effect) */}
            {data.map((point, i) => {
               const assignedCentroidIdx = assignments[i];
               if (assignedCentroidIdx === undefined || assignedCentroidIdx < 0 || !centroids[assignedCentroidIdx]) return null;
               const centroid = centroids[assignedCentroidIdx];
               const color = CANDY_COLORS[assignedCentroidIdx % CANDY_COLORS.length];
               return (
                 <line 
                    key={`line-${i}`}
                    x1={point.x} y1={point.y}
                    x2={centroid.x} y2={centroid.y}
                    stroke={color}
                    strokeWidth="0.5"
                    opacity="0.1"
                 />
               )
            })}

            {/* Centroids */}
            {centroids.map((centroid, i) => {
              const color = CANDY_COLORS[i % CANDY_COLORS.length];
              return (
                <g 
                  key={`cent-${i}-${trigger}`} // Force re-mount on trigger for animation
                  transform={`translate(${centroid.x}, ${centroid.y})`}
                  className={isAnimating ? 'animate-bounce-in' : ''}
                  style={{ animationDelay: `${i * 50}ms`, animationDuration: '400ms', animationFillMode: 'both' }}
                >
                  <style>
                    {`
                      @keyframes bounce-in {
                        0% { transform: translate(${centroid.x}px, ${centroid.y}px) scale(0); opacity: 0; }
                        60% { transform: translate(${centroid.x}px, ${centroid.y}px) scale(1.2); opacity: 1; }
                        100% { transform: translate(${centroid.x}px, ${centroid.y}px) scale(1); opacity: 1; }
                      }
                      .animate-bounce-in { animation-name: bounce-in; }
                    `}
                  </style>
                  {/* Outer Glow */}
                  <circle r="16" fill={color} opacity="0.2" />
                  {/* Star Shape for Centroid */}
                  <polygon 
                    points="0,-10 2.5,-3.5 10,-3.5 4,1 6,8.5 0,4 -6,8.5 -4,1 -10,-3.5 -2.5,-3.5" 
                    fill={color}
                    stroke="#fff"
                    strokeWidth="1.5"
                    transform="scale(1.2)"
                  />
                  {/* Number Label */}
                  <text 
                    x="0" 
                    y="1" 
                    textAnchor="middle" 
                    alignmentBaseline="middle" 
                    fill="#fff" 
                    fontSize="8" 
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}