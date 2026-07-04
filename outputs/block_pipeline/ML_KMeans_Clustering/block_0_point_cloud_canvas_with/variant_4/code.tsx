import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, Play, Square, RefreshCcw, PieChart, Info, MapPin } from 'lucide-react';

// --- Math & Generation Helpers --- //

function randn_bm() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function generateBlobs(n: number, centers: number, noise: number) {
  const points = [];
  const centerCoords = Array.from({ length: centers }, () => ({
    x: (Math.random() - 0.5) * 2.5,
    y: (Math.random() - 0.5) * 2.5,
  }));
  for (let i = 0; i < n; i++) {
    const c = centerCoords[i % centers];
    points.push({
      x: c.x + randn_bm() * noise,
      y: c.y + randn_bm() * noise,
    });
  }
  return points;
}

function generateMoons(n: number, noise: number) {
  const points = [];
  const n_half = Math.floor(n / 2);
  for (let i = 0; i < n_half; i++) {
    const theta = Math.random() * Math.PI;
    points.push({
      x: Math.cos(theta) - 0.5 + randn_bm() * noise,
      y: Math.sin(theta) - 0.25 + randn_bm() * noise,
    });
  }
  for (let i = 0; i < n - n_half; i++) {
    const theta = Math.random() * Math.PI;
    points.push({
      x: 1 - Math.cos(theta) - 0.5 + randn_bm() * noise,
      y: 0.5 - Math.sin(theta) - 0.25 + randn_bm() * noise,
    });
  }
  return points;
}

function generateConcentric(n: number, noise: number) {
  const points = [];
  const n_half = Math.floor(n / 2);
  for (let i = 0; i < n_half; i++) {
    const theta = Math.random() * 2 * Math.PI;
    points.push({
      x: 0.4 * Math.cos(theta) + randn_bm() * noise,
      y: 0.4 * Math.sin(theta) + randn_bm() * noise,
    });
  }
  for (let i = 0; i < n - n_half; i++) {
    const theta = Math.random() * 2 * Math.PI;
    points.push({
      x: 1.3 * Math.cos(theta) + randn_bm() * noise,
      y: 1.3 * Math.sin(theta) + randn_bm() * noise,
    });
  }
  return points;
}

type Point = { x: number; y: number };

// Candy color palette for clusters
const CANDY_COLORS = [
  '#FF6B8B', // Pink
  '#00E5FF', // Cyan
  '#FFD700', // Yellow
  '#B388FF', // Purple
  '#C6FF00', // Lime
  '#FF9E00', // Orange
  '#FF3D00', // Red-Orange
  '#00B0FF', // Light Blue
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Data State
  const [datasetType, setDatasetType] = useState<'blobs' | 'moons' | 'concentric'>('blobs');
  const [numPoints, setNumPoints] = useState<number>(400);
  const [noise, setNoise] = useState<number>(0.15);
  const [points, setPoints] = useState<Point[]>([]);
  
  // Algorithm State
  const [k, setK] = useState<number>(3);
  const [centroids, setCentroids] = useState<Point[]>([]);
  const [assignments, setAssignments] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [stepCount, setStepCount] = useState(0);

  // Domain scaling (map coordinates roughly in [-2, 2] to canvas)
  const DOMAIN_MIN = -2;
  const DOMAIN_MAX = 2;

  // Initialize dataset
  const initDataset = useCallback(() => {
    let newPoints: Point[] = [];
    if (datasetType === 'blobs') newPoints = generateBlobs(numPoints, k, noise);
    else if (datasetType === 'moons') newPoints = generateMoons(numPoints, noise);
    else if (datasetType === 'concentric') newPoints = generateConcentric(numPoints, noise);
    
    setPoints(newPoints);
    setCentroids([]);
    setAssignments([]);
    setStepCount(0);
    setIsAnimating(false);
  }, [datasetType, numPoints, k, noise]);

  // Initial load
  useEffect(() => {
    initDataset();
  }, [initDataset]);

  // K-Means Step Logic
  const runKMeansStep = useCallback(() => {
    if (points.length === 0) return false;

    let currentCentroids = [...centroids];
    
    // 1. Initialization (Random points from dataset)
    if (currentCentroids.length === 0) {
      const shuffled = [...points].sort(() => 0.5 - Math.random());
      currentCentroids = shuffled.slice(0, k);
    }

    // 2. Assignment Step
    let newAssignments = [];
    let changed = false;
    for (let i = 0; i < points.length; i++) {
      let minDist = Infinity;
      let cluster = 0;
      for (let j = 0; j < currentCentroids.length; j++) {
        const dx = points[i].x - currentCentroids[j].x;
        const dy = points[i].y - currentCentroids[j].y;
        const dist = dx * dx + dy * dy; // squared distance is fine
        if (dist < minDist) {
          minDist = dist;
          cluster = j;
        }
      }
      newAssignments.push(cluster);
      if (assignments[i] !== cluster) changed = true;
    }

    // 3. Update Step
    let newCentroids = Array.from({ length: k }, () => ({ x: 0, y: 0 }));
    let counts = Array(k).fill(0);

    for (let i = 0; i < points.length; i++) {
      const c = newAssignments[i];
      newCentroids[c].x += points[i].x;
      newCentroids[c].y += points[i].y;
      counts[c]++;
    }

    for (let j = 0; j < k; j++) {
      if (counts[j] > 0) {
        newCentroids[j].x /= counts[j];
        newCentroids[j].y /= counts[j];
      } else {
        // Handle empty cluster by keeping old centroid
        newCentroids[j] = currentCentroids[j];
      }
    }

    // Check convergence (centroids didn't move)
    let moved = false;
    for (let j = 0; j < k; j++) {
      const dx = newCentroids[j].x - currentCentroids[j].x;
      const dy = newCentroids[j].y - currentCentroids[j].y;
      if (Math.sqrt(dx * dx + dy * dy) > 0.001) moved = true;
    }

    setCentroids(newCentroids);
    setAssignments(newAssignments);
    setStepCount((s) => s + 1);

    return moved && changed;
  }, [points, centroids, assignments, k]);

  // Animation Loop
  useEffect(() => {
    let interval: number;
    if (isAnimating) {
      interval = window.setInterval(() => {
        const keepsGoing = runKMeansStep();
        if (!keepsGoing) {
          setIsAnimating(false);
        }
      }, 500); // 500ms delay to clearly see centroid drift
    }
    return () => clearInterval(interval);
  }, [isAnimating, runKMeansStep]);

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Helper to map logic coords to canvas coords
    const mapToCanvas = (val: number, isX: boolean) => {
      const range = DOMAIN_MAX - DOMAIN_MIN;
      const pct = (val - DOMAIN_MIN) / range;
      return isX ? pct * width : height - (pct * height); // Invert Y axis
    };

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo((width / 10) * i, 0);
      ctx.lineTo((width / 10) * i, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (height / 10) * i);
      ctx.lineTo(width, (height / 10) * i);
      ctx.stroke();
    }

    // Draw points
    points.forEach((p, idx) => {
      const cx = mapToCanvas(p.x, true);
      const cy = mapToCanvas(p.y, false);
      const clusterIdx = assignments[idx];
      
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
      
      if (clusterIdx !== undefined && clusterIdx < CANDY_COLORS.length) {
        ctx.fillStyle = CANDY_COLORS[clusterIdx];
        ctx.globalAlpha = 0.8;
      } else {
        ctx.fillStyle = '#CBD5E1'; // Slate-300
        ctx.globalAlpha = 0.6;
      }
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Draw Centroids
    centroids.forEach((c, idx) => {
      const cx = mapToCanvas(c.x, true);
      const cy = mapToCanvas(c.y, false);
      
      // Halo
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, 2 * Math.PI);
      ctx.fillStyle = CANDY_COLORS[idx % CANDY_COLORS.length];
      ctx.globalAlpha = 0.3;
      ctx.fill();

      // Center Cross/Circle
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
      ctx.fillStyle = CANDY_COLORS[idx % CANDY_COLORS.length];
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // 'X' inside
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy - 3);
      ctx.lineTo(cx + 3, cy + 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 3, cy - 3);
      ctx.lineTo(cx - 3, cy + 3);
      ctx.stroke();
    });

  }, [points, centroids, assignments]);

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-800 font-sans flex flex-col selection:bg-pink-100">
      
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-400 to-orange-400 flex items-center justify-center shadow-md">
            <PieChart className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            K-Means & Friends Lab
          </h1>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4"/> Point Cloud Engine</span>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar - Controls */}
        <aside className="w-80 bg-white border-r border-gray-100 flex flex-col shadow-[2px_0_8px_rgba(0,0,0,0.02)] z-10 overflow-y-auto">
          <div className="p-6 flex flex-col gap-8">
            
            {/* Dataset Presets */}
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <Settings className="w-3.5 h-3.5" /> Data Generation
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-2 block">Preset Shape</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['blobs', 'moons', 'concentric'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setDatasetType(type)}
                        className={`py-2 px-1 text-xs font-semibold rounded-md transition-all ${
                          datasetType === type 
                          ? 'bg-slate-800 text-white shadow-md' 
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-semibold text-slate-600">Points</label>
                    <span className="text-xs text-slate-400 font-mono">{numPoints}</span>
                  </div>
                  <input 
                    type="range" min="50" max="1000" step="50"
                    value={numPoints}
                    onChange={(e) => setNumPoints(parseInt(e.target.value))}
                    className="w-full accent-pink-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-semibold text-slate-600">Noise Level</label>
                    <span className="text-xs text-slate-400 font-mono">{noise.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" min="0.0" max="0.5" step="0.05"
                    value={noise}
                    onChange={(e) => setNoise(parseFloat(e.target.value))}
                    className="w-full accent-pink-500"
                  />
                </div>

                <button 
                  onClick={initDataset}
                  className="w-full py-2.5 mt-2 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors"
                >
                  <RefreshCcw className="w-4 h-4" /> Generate Points
                </button>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Algorithm Settings */}
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <PieChart className="w-3.5 h-3.5" /> Clustering Controls
              </h2>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-600">Number of Clusters (K)</label>
                    <span className="text-xs font-bold text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full">{k}</span>
                  </div>
                  <input 
                    type="range" min="2" max="8" step="1"
                    value={k}
                    onChange={(e) => setK(parseInt(e.target.value))}
                    className="w-full accent-pink-500"
                    disabled={isAnimating}
                  />
                  <div className="flex justify-between px-1 mt-1 text-[10px] text-slate-400 font-medium">
                    <span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Iteration</div>
                    <div className="text-lg font-mono font-semibold text-slate-700">{stepCount}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Algorithm</div>
                    <div className="text-sm font-semibold text-slate-700 mt-1">K-Means</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      if (isAnimating) {
                        setIsAnimating(false);
                      } else {
                        setIsAnimating(true);
                      }
                    }}
                    className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-white rounded-xl text-sm font-bold shadow-md transition-all ${
                      isAnimating 
                      ? 'bg-rose-500 hover:bg-rose-600 hover:shadow-lg' 
                      : 'bg-slate-800 hover:bg-slate-900 hover:shadow-lg'
                    }`}
                  >
                    {isAnimating ? (
                      <><Square className="w-4 h-4 fill-current" /> Stop</>
                    ) : (
                      <><Play className="w-4 h-4 fill-current" /> Auto-Run</>
                    )}
                  </button>
                  <button
                    onClick={runKMeansStep}
                    disabled={isAnimating}
                    className="flex-1 py-3 px-4 flex items-center justify-center gap-2 bg-pink-100 text-pink-700 hover:bg-pink-200 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Step +1
                  </button>
                </div>

              </div>
            </section>

          </div>
        </aside>

        {/* Center - Canvas Area */}
        <div className="flex-1 bg-gray-50/50 p-8 flex flex-col items-center justify