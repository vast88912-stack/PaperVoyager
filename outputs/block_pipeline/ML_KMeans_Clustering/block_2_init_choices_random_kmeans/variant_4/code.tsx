import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, Info, Dna, Target, Shuffle } from 'lucide-react';

// Types
type Point = {
  id: number;
  x: number;
  y: number;
  weight?: number; // Used to visualize probability/distance
};

type Centroid = {
  id: number;
  x: number;
  y: number;
  color: string;
};

type Strategy = 'random' | 'kmeans++' | 'farthest';

// Constants
const CANDY_COLORS = [
  '#FF66A3', // Strawberry Pink
  '#9D72FF', // Grape Purple
  '#45C4FF', // Bubblegum Blue
  '#FFBD33', // Mango Orange
  '#33E0A1', // Mint Green
  '#FF5C5C', // Cherry Red
  '#E6A8D7', // Cotton Candy
  '#8BD3E6', // Blue Raspberry
];

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export default function App() {
  const [points, setPoints] = useState<Point[]>([]);
  const [centroids, setCentroids] = useState<Centroid[]>([]);
  const [k, setK] = useState<number>(4);
  const [strategy, setStrategy] = useState<Strategy>('kmeans++');
  const [isAnimating, setIsAnimating] = useState(false);
  const [stepMessage, setStepMessage] = useState<string>('Ready to initialize.');
  
  // Refs to avoid state closure issues during async animation
  const isAnimatingRef = useRef(false);

  // Generate dataset (Blobs)
  const generatePoints = useCallback(() => {
    const numPoints = 400;
    const numBlobs = 5;
    const newPoints: Point[] = [];
    
    // Create random blob centers
    const centers = Array.from({ length: numBlobs }, () => ({
      x: 150 + Math.random() * (CANVAS_WIDTH - 300),
      y: 150 + Math.random() * (CANVAS_HEIGHT - 300)
    }));

    for (let i = 0; i < numPoints; i++) {
      const c = centers[i % numBlobs];
      // Box-Muller transform for Gaussian noise
      const u = Math.random();
      const v = Math.random();
      const radius = 50 * Math.sqrt(-2.0 * Math.log(u === 0 ? 0.0001 : u));
      const theta = 2.0 * Math.PI * v;
      
      let x = c.x + radius * Math.cos(theta);
      let y = c.y + radius * Math.sin(theta);
      
      // Clamp to canvas
      x = Math.max(20, Math.min(CANVAS_WIDTH - 20, x));
      y = Math.max(20, Math.min(CANVAS_HEIGHT - 20, y));

      newPoints.push({ id: i, x, y, weight: 0 });
    }
    setPoints(newPoints);
    setCentroids([]);
    setStepMessage('Generated new dataset. Select a strategy and initialize.');
  }, []);

  // Initial load
  useEffect(() => {
    generatePoints();
  }, [generatePoints]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const distSq = (p1: { x: number; y: number }, p2: { x: number; y: number }) => 
    (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;

  const runInitialization = async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    isAnimatingRef.current = true;
    setCentroids([]);
    
    let currentCentroids: Centroid[] = [];
    let currentPoints = [...points].map(p => ({ ...p, weight: 0 }));
    setPoints(currentPoints);

    setStepMessage(`Starting ${strategy} initialization...`);
    await delay(500);

    for (let i = 0; i < k; i++) {
      if (!isAnimatingRef.current) break;

      let nextPointIndex = -1;

      if (strategy === 'random' || i === 0) {
        // Pick random
        if (i === 0 && strategy !== 'random') {
          setStepMessage('Picking the first centroid completely at random.');
        } else if (strategy === 'random') {
          setStepMessage(`Picking centroid ${i + 1} completely at random.`);
        }
        nextPointIndex = Math.floor(Math.random() * currentPoints.length);
        
      } else if (strategy === 'kmeans++' || strategy === 'farthest') {
        setStepMessage(`Calculating distances from existing centroids...`);
        
        // Calculate min dist sq for each point to any existing centroid
        const dists = currentPoints.map(p => 
          Math.min(...currentCentroids.map(c => distSq(p, c)))
        );
        
        const maxDist = Math.max(...dists);
        
        // Visualize weights (distance proportional to size/opacity)
        currentPoints = currentPoints.map((p, idx) => ({
          ...p,
          weight: dists[idx] / (maxDist || 1)
        }));
        setPoints([...currentPoints]);
        
        await delay(800);

        if (strategy === 'farthest') {
          setStepMessage(`Picking the point strictly farthest from all centroids.`);
          nextPointIndex = dists.indexOf(maxDist);
        } else {
          setStepMessage(`Picking next point with probability proportional to D(x)²...`);
          const sum = dists.reduce((a, b) => a + b, 0);
          let r = Math.random() * sum;
          for (let j = 0; j < dists.length; j++) {
            r -= dists[j];
            if (r <= 0) {
              nextPointIndex = j;
              break;
            }
          }
          // Fallback due to float precision
          if (nextPointIndex === -1) nextPointIndex = dists.length - 1;
        }
      }

      // Add the chosen point as a new centroid
      const chosen = currentPoints[nextPointIndex];
      const newCentroid: Centroid = {
        id: i,
        x: chosen.x,
        y: chosen.y,
        color: CANDY_COLORS[i % CANDY_COLORS.length]
      };
      
      currentCentroids = [...currentCentroids, newCentroid];
      setCentroids(currentCentroids);
      
      // Reset weights for clean look after pick
      currentPoints = currentPoints.map(p => ({ ...p, weight: 0 }));
      setPoints([...currentPoints]);
      
      await delay(800);
    }

    if (isAnimatingRef.current) {
      setStepMessage('Initialization complete!');
      setIsAnimating(false);
      isAnimatingRef.current = false;
    }
  };

  const reset = () => {
    isAnimatingRef.current = false;
    setIsAnimating(false);
    setCentroids([]);
    setPoints(points.map(p => ({ ...p, weight: 0 })));
    setStepMessage('Ready to initialize.');
  };

  // Assign each point to nearest centroid for coloring purposes (if centroids exist)
  const getAssignedColor = (point: Point) => {
    if (centroids.length === 0) return '#cbd5e1'; // slate-300
    let minDist = Infinity;
    let color = '#cbd5e1';
    for (const c of centroids) {
      const d = distSq(point, c);
      if (d < minDist) {
        minDist = d;
        color = c.color;
      }
    }
    return color;
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
      
      {/* Sidebar Controls */}
      <div className="w-[420px] bg-white border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col z-10">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50">
          <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 tracking-tight">
            Init Choices Lab
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">K-Means & Friends • Variant #5</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          
          {/* Strategy Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Initialization Strategy
            </label>
            <div className="grid gap-3">
              <StrategyCard 
                active={strategy === 'random'} 
                onClick={() => !isAnimating && setStrategy('random')}
                icon={<Shuffle size={18} />}
                title="Random"
                desc="Picks K points uniformly at random. Fast, but can lead to poor convergence."
                disabled={isAnimating}
              />
              <StrategyCard 
                active={strategy === 'kmeans++'} 
                onClick={() => !isAnimating && setStrategy('kmeans++')}
                icon={<Dna size={18} />}
                title="K-Means++"
                desc="Probabilistic distribution spreading centroids out based on D(x)². Industry standard."
                disabled={isAnimating}
              />
              <StrategyCard 
                active={strategy === 'farthest'} 
                onClick={() => !isAnimating && setStrategy('farthest')}
                icon={<Target size={18} />}
                title="Farthest Point"
                desc="Strictly picks the point with the maximum distance to existing centroids (Maximin)."
                disabled={isAnimating}
              />
            </div>
          </div>

          {/* Parameters */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Number of Clusters (K)
              </label>
              <span className="text-lg font-bold text-violet-600 bg-violet-100 px-3 py-0.5 rounded-full">
                {k}
              </span>
            </div>
            <input 
              type="range" 
              min="2" max="8" 
              value={k} 
              onChange={(e) => {
                setK(parseInt(e.target.value));
                if (!isAnimating) reset();
              }}
              disabled={isAnimating}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-500 disabled:opacity-50"
            />
          </div>

          {/* Info Panel */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 flex gap-3 leading-relaxed">
            <Info className="shrink-0 text-blue-500 mt-0.5" size={18} />
            <p>
              Watch how the algorithms select initial centers. <strong>K-Means++</strong> and <strong>Farthest Point</strong> calculate distances to spread centroids out, visualized by the expanding point sizes before a selection is made.
            </p>
          </div>
        </div>

        {/* Action Bottom Bar */}
        <div className="p-6 border-t border-slate-100 bg-white grid grid-cols-2 gap-3">
          <button 
            onClick={generatePoints}
            disabled={isAnimating}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            <RotateCcw size={18} />
            New Data
          </button>
          
          {centroids.length === k ? (
            <button 
              onClick={reset}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-xl transition-colors"
            >
              Reset
            </button>
          ) : (
            <button 
              onClick={runInitialization}
              disabled={isAnimating}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-semibold rounded-xl transition-all shadow-md shadow-violet-500/20 disabled:opacity-50"
            >
              {isAnimating ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running...
                </span>
              ) : (
                <>
                  <Play size={18} fill="currentColor" />
                  Initialize
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col relative bg-slate-50/50">
        
        {/* Top bar status */}
        <div className="absolute top-6 left-6 right-6 z-10 flex justify-between items-center pointer-events-none">
          <div className="bg-white/80 backdrop-blur-md border border-white/50 shadow-sm px-5 py-3 rounded-2xl flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isAnimating ? 'bg-fuchsia-500 animate-pulse' : 'bg-green-400'}`} />
            <span className="font-medium text-slate-700">{stepMessage}</span>
          </div>
          
          <div className="bg-white/80 backdrop-blur-md border border-white/50 shadow-sm px-4 py-2 rounded-2xl flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-400">Centroids</span>
            <span className="text-lg font-black text-slate-700">{centroids.length} / {k}</span>
          </div>
        </div>

        {/* SVG Canvas Container */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-2 overflow-hidden">
            <svg 
              width={CANVAS_WIDTH} 
              height={CANVAS_HEIGHT} 
              className="bg-slate-50/30 rounded-2xl"
              style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.01))' }}
            >
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Data Points */}
              {points.map(p => {
                const assignedColor = getAssignedColor(p);
                const isHighlighting = (p.weight ?? 0) > 0;
                // Calculate dynamic radius. Base radius is 4. If highlighting (K-means++ dist visualization), scale up to 12 based on weight.
                const baseRadius = centroids.length > 0 ? 5 : 4;
                const dynamicRadius = isHighlighting ? baseRadius + (p.weight! * 12) : baseRadius;
                
                return (
                  <circle
                    key={p.id}
                    cx={p.x}
                    cy={p.y}
                    r={dynamicRadius}
                    fill={assignedColor}
                    opacity={isHighlighting ? 0.9 : centroids.length > 0 ? 0.6 : 0.4}
                    className="transition-all duration-300 ease-out"
                    stroke={isHighlighting ? '#1e293b' : 'none'}
                    strokeWidth={isHighlighting ? p.weight! * 2 : 0}
                  />
                );
              })}

              {/* Centroids */}
              {centroids.map((c, idx) => (
                <g 
                  key={`centroid-${c.id}`} 
                  transform={`translate(${c.x}, ${c.y})`}
                  className="animate-[popIn_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)]"
                >
                  {/* Outer glow ring */}
                  <circle
                    r="24"
                    fill="none"
                    stroke={c.color}
                    strokeWidth="2"
                    opacity="0.3"
                    className="animate-ping"
                    style={{ animationDuration: '2s' }}
                  />
                  {/* Inner background shadow */}
                  <circle r="12" fill="#fff" filter="url(#glow)" />
                  {/* Main Centroid Core */}
                  <path 
                    d="M 0 -12 L 3 -4 L 11 -3 L 5 2 L 7 10 L 0 6 L -7 10 L -5 2 L -11 -3 L -3 -4 Z" 
                    fill={c.color} 
                    stroke="#1e293b" 
                    strokeWidth="2"
                    transform="scale(1.4)"
                  />
                  {/* Index text */}
                  <text 
                    y="1" 
                    textAnchor="middle" 
                    alignmentBaseline="middle" 
                    fill="#1e293b" 
                    fontSize="10" 
                    fontWeight="900"
                    className="pointer-events-none"
                  >
                    {idx + 1}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

      </div>

      {/* Global styles for inline keyframes */}
      <style>{`
        @keyframes popIn {
          0% { transform: translate(var(--tw-translate-x), var(--tw-translate-y)) scale(0); opacity: 0; }
          100% { transform: translate(var(--tw-translate-x), var(--tw-translate-y)) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Subcomponent for reusable strategy cards
function StrategyCard({ 
  active, 
  onClick, 
  icon, 
  title, 
  desc, 
  disabled 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  title: string; 
  desc: string; 
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 
        ${active 
          ? 'border-violet-500 bg-violet-50 shadow-[0_4px_20px_rgba(139,92,246,0.15)]' 
          : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50