import React, { useState, useEffect, useRef, useCallback } from 'react';

// Runtime Dependencies: None (pure React). 
// Icons are implemented as inline SVGs to ensure zero-dependency compilation.

type Point = { x: number; y: number };
type Centroid = Point & { color: string };
type InitMethod = 'random' | 'kmeans++' | 'farthest';

const CANDY_COLORS = [
  '#FF1493', // DeepPink
  '#00FFFF', // Cyan
  '#FFD700', // Gold/Yellow
  '#32CD32', // LimeGreen
  '#9370DB', // MediumPurple
  '#FF8C00', // DarkOrange
  '#FF69B4', // HotPink
  '#00FA9A', // MediumSpringGreen
];

const METHOD_DESCRIPTIONS = {
  random: 'Picks K random points from the dataset. Fast, but can lead to poor clustering if centroids start too close together.',
  'kmeans++': 'Chooses the first centroid randomly, then picks subsequent centroids with a probability proportional to the squared distance to the nearest existing centroid. Balances spread and density.',
  farthest: 'Chooses the first randomly, then strictly picks the data point that is furthest away from all existing centroids. Excellent for spreading out, but sensitive to outliers.'
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [dataset, setDataset] = useState<Point[]>([]);
  const [centroids, setCentroids] = useState<Centroid[]>([]);
  const [weights, setWeights] = useState<number[]>([]);
  const [k, setK] = useState<number>(4);
  const [method, setMethod] = useState<InitMethod>('kmeans++');
  const [isAnimating, setIsAnimating] = useState(false);
  
  const abortRef = useRef(false);

  // Generate Gaussian blobs
  const generateData = useCallback(() => {
    abortRef.current = true; // Stop any ongoing animation
    setIsAnimating(false);
    setCentroids([]);
    setWeights([]);
    
    const width = 800;
    const height = 600;
    const numBlobs = Math.floor(Math.random() * 3) + 4; // 4 to 6 blobs
    const newPoints: Point[] = [];
    
    for (let i = 0; i < numBlobs; i++) {
      const cx = 100 + Math.random() * (width - 200);
      const cy = 100 + Math.random() * (height - 200);
      const spread = 20 + Math.random() * 40;
      const numPointsInBlob = 40 + Math.random() * 60;
      
      for (let j = 0; j < numPointsInBlob; j++) {
        // Box-Muller transform for normal distribution
        const u = 1 - Math.random();
        const v = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        
        const px = cx + z * spread;
        const py = cy + z * spread; // Simplification, using same z for demo purposes or distinct z
        
        // Proper 2D normal distribution
        const z2 = Math.sqrt(-2.0 * Math.log(u)) * Math.sin(2.0 * Math.PI * v);
        const py2 = cy + z2 * spread;

        if (px > 0 && px < width && py2 > 0 && py2 < height) {
          newPoints.push({ x: px, y: py2 });
        }
      }
    }
    setDataset(newPoints);
  }, []);

  // Initial data generation
  useEffect(() => {
    generateData();
  }, [generateData]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#F8FAFC'; // slate-50
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#E2E8F0'; // slate-200
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // Draw dataset points
    dataset.forEach((p, i) => {
      const weight = weights[i] || 0;
      
      // If we have weights (during initialization), show probability heat
      if (weight > 0) {
        ctx.beginPath();
        // Radius scales with weight
        const radius = 3 + (weight * 15);
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 20, 147, ${0.1 + weight * 0.6})`; // Candy pink heat
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = weight > 0 ? '#FF1493' : '#94A3B8'; // Highlight points with weights
      ctx.fill();
    });

    // Draw centroids
    centroids.forEach((c) => {
      // Drop shadow
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      // Outer ring
      ctx.beginPath();
      ctx.arc(c.x, c.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // Inner candy color
      ctx.shadowColor = 'transparent';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = c.color;
      ctx.fill();

      // Candy highlight (specular reflection)
      ctx.beginPath();
      ctx.arc(c.x - 3, c.y - 3, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();
    });

  }, [dataset, centroids, weights]);

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const runInitialization = async () => {
    if (dataset.length === 0) return;
    
    abortRef.current = false;
    setIsAnimating(true);
    setCentroids([]);
    setWeights([]);
    
    const currentCentroids: Centroid[] = [];
    
    // Step 1: Always pick the first centroid randomly from dataset
    const firstIdx = Math.floor(Math.random() * dataset.length);
    currentCentroids.push({ 
      ...dataset[firstIdx], 
      color: CANDY_COLORS[0] 
    });
    setCentroids([...currentCentroids]);
    
    if (abortRef.current) { setIsAnimating(false); return; }
    await sleep(600);

    // Step 2 to K
    for (let i = 1; i < k; i++) {
      if (abortRef.current) break;

      if (method === 'random') {
        // Just pick another random point
        let nextIdx = Math.floor(Math.random() * dataset.length);
        currentCentroids.push({
          ...dataset[nextIdx],
          color: CANDY_COLORS[i % CANDY_COLORS.length]
        });
        setCentroids([...currentCentroids]);
        await sleep(400);

      } else if (method === 'kmeans++') {
        // Calculate D(x)^2
        const distSq = dataset.map(p => {
          let minDist = Infinity;
          currentCentroids.forEach(c => {
            const d = Math.pow(p.x - c.x, 2) + Math.pow(p.y - c.y, 2);
            if (d < minDist) minDist = d;
          });
          return minDist;
        });

        const maxDistSq = Math.max(...distSq);
        const normWeights = distSq.map(d => maxDistSq > 0 ? d / maxDistSq : 0);
        
        // Show probability heatmap
        setWeights(normWeights);
        await sleep(800);
        if (abortRef.current) break;

        // Roulette wheel selection based on squared distance
        const sum = distSq.reduce((a, b) => a + b, 0);
        let r = Math.random() * sum;
        let nextIdx = dataset.length - 1; // fallback
        for (let j = 0; j < distSq.length; j++) {
          r -= distSq[j];
          if (r <= 0) {
            nextIdx = j;
            break;
          }
        }

        currentCentroids.push({
          ...dataset[nextIdx],
          color: CANDY_COLORS[i % CANDY_COLORS.length]
        });
        setCentroids([...currentCentroids]);
        setWeights([]); // clear heatmap
        await sleep(400);

      } else if (method === 'farthest') {
        // Calculate D(x)
        const dists = dataset.map(p => {
          let minDist = Infinity;
          currentCentroids.forEach(c => {
            const d = Math.sqrt(Math.pow(p.x - c.x, 2) + Math.pow(p.y - c.y, 2));
            if (d < minDist) minDist = d;
          });
          return minDist;
        });

        const maxDist = Math.max(...dists);
        const normWeights = dists.map(d => maxDist > 0 ? d / maxDist : 0);
        
        // Show distance heat
        setWeights(normWeights);
        await sleep(800);
        if (abortRef.current) break;

        // Pick absolute maximum
        const nextIdx = dists.indexOf(maxDist);

        currentCentroids.push({
          ...dataset[nextIdx],
          color: CANDY_COLORS[i % CANDY_COLORS.length]
        });
        setCentroids([...currentCentroids]);
        setWeights([]);
        await sleep(400);
      }
    }
    
    setWeights([]);
    setIsAnimating(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center text-white shadow-md shadow-pink-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
            K-Means & Friends Lab
          </h1>
        </div>
        <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
          Module: Initialization Effects
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full p-6 gap-6">
        
        {/* Sidebar Controls */}
        <aside className="w-80 flex flex-col gap-6 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 overflow-y-auto z-10">
          
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Environment</h2>
            <button
              onClick={generateData}
              disabled={isAnimating}
              className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 py-3 rounded-xl border border-slate-200 transition-colors disabled:opacity-50 font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
              </svg>
              Regenerate Blobs
            </button>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700">Clusters (K)</label>
                <span className="text-sm font-bold text-pink-500 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-100">{k}</span>
              </div>
              <input 
                type="range" 
                min="2" max="8" 
                value={k} 
                onChange={(e) => {
                  setK(parseInt(e.target.value));
                  abortRef.current = true;
                  setCentroids([]);
                }}
                disabled={isAnimating}
                className="w-full accent-pink-500"
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          <div className="space-y-4 flex-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Init Strategy</h2>
            
            <div className="space-y-3">
              {(['random', 'kmeans++', 'farthest'] as InitMethod[]).map((m) => (
                <label 
                  key={m} 
                  className={`flex flex-col gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    method === m 
                      ? 'border-pink-500 bg-pink-50/50 shadow-sm shadow-pink-100' 
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  } ${isAnimating ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="initMethod" 
                      value={m}
                      checked={method === m}
                      onChange={() => {
                        setMethod(m);
                        abortRef.current = true;
                        setCentroids([]);
                      }}
                      className="hidden"