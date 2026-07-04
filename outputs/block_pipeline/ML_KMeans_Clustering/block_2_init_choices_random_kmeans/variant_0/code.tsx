import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, Shuffle, Target, Zap, Info } from 'lucide-react';

// --- Types & Constants ---
type Point = { x: number; y: number };
type Centroid = Point & { color: string; id: number };

const CANDY_COLORS = [
  '#FF007F', // Neon Pink
  '#00F5D4', // Aqua
  '#FEE440', // Yellow
  '#9B5DE5', // Purple
  '#00BBF9', // Blue
  '#F15BB5', // Light Pink
  '#38B000', // Green
];

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const NUM_POINTS = 300;

// --- Helper Functions ---
const distSq = (p1: Point, p2: Point) => Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
const dist = (p1: Point, p2: Point) => Math.sqrt(distSq(p1, p2));

const generateBlobs = (numPoints: number, width: number, height: number): Point[] => {
  const points: Point[] = [];
  const numBlobs = 4;
  const centers = Array.from({ length: numBlobs }, () => ({
    x: width * 0.2 + Math.random() * (width * 0.6),
    y: height * 0.2 + Math.random() * (height * 0.6),
  }));

  for (let i = 0; i < numPoints; i++) {
    const center = centers[Math.floor(Math.random() * numBlobs)];
    // Box-Muller transform for normal distribution
    const u = 1 - Math.random();
    const v = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    const z1 = Math.sqrt(-2.0 * Math.log(u)) * Math.sin(2.0 * Math.PI * v);
    
    points.push({
      x: Math.max(10, Math.min(width - 10, center.x + z0 * 40)),
      y: Math.max(10, Math.min(height - 10, center.y + z1 * 40)),
    });
  }
  return points;
};

// --- Main Component ---
export default function App() {
  const [points, setPoints] = useState<Point[]>([]);
  const [centroids, setCentroids] = useState<Centroid[]>([]);
  const [k, setK] = useState<number>(4);
  const [method, setMethod] = useState<'random' | 'kmeans++' | 'farthest'>('kmeans++');
  const [isAnimating, setIsAnimating] = useState(false);
  const [stepExplanation, setStepExplanation] = useState<string>('Select an initialization method and click Play.');
  
  // Ref for animation timeout to allow cleanup
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize data points
  useEffect(() => {
    handleGenerateData();
    return () => clearAnimation();
  }, []);

  const clearAnimation = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsAnimating(false);
  };

  const handleGenerateData = useCallback(() => {
    clearAnimation();
    setPoints(generateBlobs(NUM_POINTS, CANVAS_WIDTH, CANVAS_HEIGHT));
    setCentroids([]);
    setStepExplanation('New dataset generated. Ready to initialize.');
  }, []);

  const getNextCentroid = (currentCentroids: Centroid[]): Point => {
    if (currentCentroids.length === 0) {
      return points[Math.floor(Math.random() * points.length)];
    }

    if (method === 'random') {
      const available = points.filter(p => !currentCentroids.some(c => c.x === p.x && c.y === p.y));
      return available[Math.floor(Math.random() * available.length)];
    }

    if (method === 'farthest') {
      let maxDist = -1;
      let bestPoint = points[0];
      for (const p of points) {
        if (currentCentroids.some(c => c.x === p.x && c.y === p.y)) continue;
        const minDist = Math.min(...currentCentroids.map(c => dist(p, c)));
        if (minDist > maxDist) {
          maxDist = minDist;
          bestPoint = p;
        }
      }
      return bestPoint;
    }

    if (method === 'kmeans++') {
      const distances = points.map(p => {
        if (currentCentroids.some(c => c.x === p.x && c.y === p.y)) return 0;
        return Math.min(...currentCentroids.map(c => distSq(p, c)));
      });
      const sum = distances.reduce((a, b) => a + b, 0);
      const r = Math.random() * sum;
      let cumulative = 0;
      for (let i = 0; i < points.length; i++) {
        cumulative += distances[i];
        if (cumulative >= r && !currentCentroids.some(c => c.x === points[i].x && c.y === points[i].y)) {
          return points[i];
        }
      }
      return points[Math.floor(Math.random() * points.length)];
    }

    return points[0];
  };

  const runInitialization = () => {
    clearAnimation();
    setCentroids([]);
    setIsAnimating(true);
    
    let currentCentroids: Centroid[] = [];
    
    const step = () => {
      if (currentCentroids.length >= k) {
        setIsAnimating(false);
        setStepExplanation(`Finished initializing ${k} centroids using ${method}.`);
        return;
      }

      const nextPoint = getNextCentroid(currentCentroids);
      const newCentroid: Centroid = {
        ...nextPoint,
        color: CANDY_COLORS[currentCentroids.length % CANDY_COLORS.length],
        id: currentCentroids.length,
      };
      
      currentCentroids = [...currentCentroids, newCentroid];
      setCentroids(currentCentroids);

      // Update explanation based on method and step
      if (currentCentroids.length === 1) {
        setStepExplanation('Step 1: Picked the first centroid completely at random.');
      } else {
        if (method === 'random') {
          setStepExplanation(`Step ${currentCentroids.length}: Picked another random point.`);
        } else if (method === 'farthest') {
          setStepExplanation(`Step ${currentCentroids.length}: Picked the point farthest from all existing centroids.`);
        } else if (method === 'kmeans++') {
          setStepExplanation(`Step ${currentCentroids.length}: Picked a point with probability proportional to squared distance (D²).`);
        }
      }

      timeoutRef.current = setTimeout(step, 800); // 800ms delay between picks
    };

    step();
  };

  const resetCentroids = () => {
    clearAnimation();
    setCentroids([]);
    setStepExplanation('Centroids cleared. Ready to initialize.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-5xl mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Target className="w-8 h-8 text-pink-500" />
            Initialization Strategies
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Compare how Random, K-Means++, and Farthest First place initial centroids.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerateData}
            disabled={isAnimating}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Shuffle className="w-4 h-4" />
            New Data
          </button>
        </div>
      </header>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar Controls */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Controls Card */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Settings</h2>
            
            <div className="mb-6">
              <label className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                <span>Number of Clusters (k)</span>
                <span className="text-pink-500 font-bold">{k}</span>
              </label>
              <input
                type="range"
                min="2"
                max="7"
                value={k}
                onChange={(e) => setK(parseInt(e.target.value))}
                disabled={isAnimating}
                className="w-full accent-pink-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Initialization Method
              </label>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'random', label: 'Random', icon: Shuffle, desc: 'Completely random points' },
                  { id: 'kmeans++', label: 'K-Means++', icon: Zap, desc: 'Proportional to D²' },
                  { id: 'farthest', label: 'Farthest First', icon: Target, desc: 'Maximizes minimum distance' }
                ].map((m) => {
                  const Icon = m.icon;
                  const isActive = method === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id as any)}
                      disabled={isAnimating}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        isActive 
                          ? 'border-pink-500 bg-pink-50 ring-1 ring-pink-500' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      } disabled:opacity-50`}
                    >
                      <Icon className={`w-5 h-5 mt-0.5 ${isActive ? 'text-pink-500' : 'text-slate-400'}`} />
                      <div>
                        <div className={`font-semibold text-sm ${isActive ? 'text-pink-700' : 'text-slate-700'}`}>
                          {m.label}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{m.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={runInitialization}
                disabled={isAnimating}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl font-semibold shadow-md hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 fill-current" />
                {isAnimating ? 'Initializing...' : 'Run Init'}
              </button>
              <button
                onClick={resetCentroids}
                disabled={isAnimating || centroids.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-slate-700 font-medium transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                Clear Centroids
              </button>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 text-blue-800">
            <div className="flex items-center gap-2 mb-2 font-bold">
              <Info className="w-5 h-5" />
              Why it matters
            </div>
            <p className="text-sm leading-relaxed opacity-90">
              Poor initialization can cause K-Means to converge to sub-optimal local minima. 
              <strong> K-Means++</strong> spreads out initial centroids to speed up convergence and improve final clustering quality.
            </p>
          </div>
        </div>

        {/* Main Visualization Area */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Canvas Container */}
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
            <svg 
              viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} 
              className="w-full h-auto bg-slate-50/50 rounded-xl"
              style={{ maxHeight: '600px' }}
            >
              {/* Draw Data Points */}
              {points.map((p, i) => (
                <circle
                  key={`p-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  className="fill-slate-300 transition-all duration-300"
                />
              ))}

              {/* Draw distance lines for the newest centroid if animating */}
              {isAnimating && centroids.length > 1 && (
                centroids.slice(0, -1).map((c, i) => (
                  <line
                    key={`line-${i}`}
                    x1={c.x}
                    y1={c.y}
                    x2={centroids[centroids.length - 1].x}
                    y2={centroids[centroids.length - 1].y}
                    stroke={centroids[centroids.length - 1].color}
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    className="opacity-40 animate-pulse"
                  />
                ))
              )}

              {/* Draw Centroids */}
              {centroids.map((c, i) => (
                <g key={`c-${c.id}`} className="transition-all duration-500 ease-out">
                  {/* Pulse effect for newest centroid */}
                  {i === centroids.length - 1 && isAnimating && (
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={30}
                      fill={c.color}
                      className="opacity-20 animate-ping"
                      style={{ transformOrigin: `${c.x}px ${c.y}px` }}
                    />
                  )}
                  {/* Outer glow */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={14}
                    fill={c.color}
                    className="opacity-30"
                  />
                  {/* Inner core */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={8}
                    fill={c.color}
                    stroke="#fff"
                    strokeWidth="2"
                    className="shadow-lg"
                  />
                  {/* Label */}
                  <text
                    x={c.x}
                    y={c.y - 20}
                    textAnchor="middle"
                    fill={c.color}
                    className="text-xs font-bold drop-shadow-md"
                  >
                    C{i + 1}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Live Explanation Bar */}
          <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            <p className="text-slate-700 font-medium">
              {stepExplanation}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}