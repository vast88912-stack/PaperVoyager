import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Activity, ScatterChart, 
  Settings2, ChevronRight, BarChart3, Database, Fingerprint
} from 'lucide-react';

// --- Constants & Types ---
const CANDY_COLORS = ['#FF6B81', '#1DD1A1', '#FECA57', '#5F27CD', '#54A0FF', '#FF9F43', '#00D2D3'];
const NUM_POINTS = 250;
const CANVAS_SIZE = 400;

type Point = { x: number; y: number; cluster?: number; opacity?: number };
type Centroid = { x: number; y: number; id: number; color: string };
type DatasetType = 'blobs' | 'moons' | 'concentric';
type InitMethod = 'random' | 'kmeans++' | 'farthest';
type Algorithm = 'kmeans' | 'kmedoids' | 'minibatch' | 'gmm';

// --- Math & Utils ---
const distance = (p1: Point, p2: Point) => Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

const generateDataset = (type: DatasetType, k: number): Point[] => {
  const points: Point[] = [];
  if (type === 'blobs') {
    const centers = Array.from({ length: Math.max(k, 3) }).map(() => ({
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
    }));
    for (let i = 0; i < NUM_POINTS; i++) {
      const c = centers[i % centers.length];
      points.push({
        x: c.x + (Math.random() - 0.5) * 15,
        y: c.y + (Math.random() - 0.5) * 15,
      });
    }
  } else if (type === 'moons') {
    for (let i = 0; i < NUM_POINTS; i++) {
      const isTop = i % 2 === 0;
      const angle = Math.random() * Math.PI;
      const radius = 25 + Math.random() * 5;
      if (isTop) {
        points.push({ x: 40 + Math.cos(angle) * radius, y: 45 - Math.sin(angle) * radius });
      } else {
        points.push({ x: 60 + Math.cos(angle) * radius, y: 55 + Math.sin(angle) * radius });
      }
    }
  } else if (type === 'concentric') {
    for (let i = 0; i < NUM_POINTS; i++) {
      const ring = i % 2 === 0 ? 15 : 35;
      const angle = Math.random() * Math.PI * 2;
      const r = ring + (Math.random() - 0.5) * 8;
      points.push({
        x: 50 + Math.cos(angle) * r,
        y: 50 + Math.sin(angle) * r,
      });
    }
  }
  // Clamp to 0-100
  return points.map(p => ({
    x: Math.max(5, Math.min(95, p.x)),
    y: Math.max(5, Math.min(95, p.y)),
  }));
};

// --- Live Inertia Chart Component ---
const LiveInertiaChart = ({ history, isPlaying }: { history: number[], isPlaying: boolean }) => {
  const chartRef = useRef<SVGSVGElement>(null);
  
  const paddedHistory = history.length === 0 ? [0] : history;
  const maxInertia = Math.max(...paddedHistory, 100);
  const minInertia = Math.min(...paddedHistory, 0);
  
  // Create path data for the line chart
  const createPath = (data: number[], width: number, height: number) => {
    if (data.length === 0) return '';
    if (data.length === 1) return `M 0,${height - ((data[0] - minInertia) / (maxInertia - minInertia || 1)) * height}`;
    
    const xStep = width / (data.length - 1);
    const points = data.map((val, i) => {
      const x = i * xStep;
      const y = height - ((val - minInertia) / (maxInertia - minInertia || 1)) * height;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  const chartHeight = 160;
  const chartWidth = 400;
  const pathData = createPath(paddedHistory, chartWidth, chartHeight);
  
  const currentInertia = history.length > 0 ? history[history.length - 1] : 0;
  const percentDrop = history.length > 1 
    ? ((history[0] - currentInertia) / history[0]) * 100 
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full relative">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between z-10 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-slate-800">Live Inertia Tracking</h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-800 tabular-nums">
            {currentInertia.toFixed(0)}
          </div>
          <div className="text-xs font-medium text-slate-400">
            {history.length > 1 ? `↓ ${percentDrop.toFixed(1)}% overall` : 'Sum of Squared Distances'}
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 relative flex items-end justify-center min-h-[200px] group">
        {/* Y-Axis Grid Lines */}
        <div className="absolute inset-x-4 inset-y-4 flex flex-col justify-between pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-full h-px bg-slate-100/80 flex items-end">
              <span className="text-[10px] text-slate-300 -translate-y-3 opacity-0 group-hover:opacity-100 transition-opacity">
                {Math.round(maxInertia - (maxInertia - minInertia) * (i / 4))}
              </span>
            </div>
          ))}
        </div>

        {/* SVG Chart */}
        <svg 
          ref={chartRef}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full overflow-visible z-10"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {history.length > 1 && (
            <>
              {/* Fill Area */}
              <path 
                d={`${pathData} L ${chartWidth},${chartHeight} L 0,${chartHeight} Z`} 
                fill="url(#chartGradient)" 
                className="transition-all duration-300 ease-out"
              />
              {/* Stroke Path */}
              <path 
                d={pathData} 
                fill="none" 
                stroke="#6366f1" 
                strokeWidth="3" 
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
                className="transition-all duration-300 ease-out"
              />
              {/* Current Value Dot */}
              <circle 
                cx={chartWidth} 
                cy={chartHeight - ((currentInertia - minInertia) / (maxInertia - minInertia || 1)) * chartHeight} 
                r="5" 
                fill="#ffffff" 
                stroke="#6366f1" 
                strokeWidth="3"
                className="transition-all duration-300 ease-out"
              />
              {isPlaying && (
                <circle 
                  cx={chartWidth} 
                  cy={chartHeight - ((currentInertia - minInertia) / (maxInertia - minInertia || 1)) * chartHeight} 
                  r="12" 
                  fill="#6366f1" 
                  opacity="0.3"
                  className="animate-ping"
                />
              )}
            </>
          )}
        </svg>

        {/* Empty State */}
        {history.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-medium">
            Run clustering to map inertia
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [dataset, setDataset] = useState<DatasetType>('blobs');
  const [k, setK] = useState(3);
  const [initMethod, setInitMethod] = useState<InitMethod>('kmeans++');
  const [algorithm, setAlgorithm] = useState<Algorithm>('kmeans');
  const [miniBatchSize, setMiniBatchSize] = useState(50);
  
  const [points, setPoints] = useState<Point[]>([]);
  const [centroids, setCentroids] = useState<Centroid[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const [stepCount, setStepCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [silhouette, setSilhouette] = useState<number | null>(null);

  // Initialize Data
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, k]);

  const reset = useCallback(() => {
    const pts = generateDataset(dataset, k);
    setPoints(pts);
    setCentroids([]);
    setHistory([]);
    setStepCount(0);
    setIsPlaying(false);
    setSilhouette(null);
  }, [dataset, k]);

  const calculateInertia = (pts: Point[], cents: Centroid[]) => {
    if (!cents.length) return 0;
    return pts.reduce((sum, p) => {
      if (p.cluster === undefined) return sum;
      const c = cents[p.cluster];
      return sum + distance(p, c) ** 2;
    }, 0);
  };

  const calculateSilhouetteApprox = (pts: Point[], cents: Centroid[]) => {
    // Simplified silhouette for UI speed
    if (cents.length < 2) return 0;
    let totalSil = 0;
    let validPts = 0;

    for (const p of pts) {
      if (p.cluster === undefined) continue;
      
      let a = 0;
      let ownCount = 0;
      let minB = Infinity;

      cents.forEach((c, idx) => {
        let distSum = 0;
        let count = 0;
        pts.forEach(op => {
          if (op.cluster === idx) {
            distSum += distance(p, op);
            count++;
          }
        });

        const avgDist = count > 0 ? distSum / count : distance(p, c);
        if (idx === p.cluster) {
          a = avgDist;
          ownCount = count;
        } else {
          if (avgDist < minB) minB = avgDist;
        }
      });

      if (ownCount > 1) {
        const s = (minB - a) / Math.max(a, minB);
        totalSil += s;
        validPts++;
      }
    }
    return validPts > 0 ? totalSil / validPts : 0;
  };

  const initCentroids = () => {
    let newCents: Centroid[] = [];
    
    if (initMethod === 'random') {
      const shuffled = [...points].sort(() => 0.5 - Math.random());
      newCents = shuffled.slice(0, k).map((p, i) => ({ x: p.x, y: p.y, id: i, color: CANDY_COLORS[i % CANDY_COLORS.length] }));
    } 
    else if (initMethod === 'farthest') {
      newCents.push({ ...points[Math.floor(Math.random() * points.length)], id: 0, color: CANDY_COLORS[0] });
      while (newCents.length < k) {
        let maxDist = -1;
        let farthestPoint = points[0];
        points.forEach(p => {
          const minDist = Math.min(...newCents.map(c => distance(p, c)));
          if (minDist > maxDist) {
            maxDist = minDist;
            farthestPoint = p;
          }
        });
        newCents.push({ ...farthestPoint, id: newCents.length, color: CANDY_COLORS[newCents.length % CANDY_COLORS.length] });
      }
    }
    else { // KMeans++
      newCents.push({ ...points[Math.floor(Math.random() * points.length)], id: 0, color: CANDY_COLORS[0] });
      while (newCents.length < k) {
        const dists = points.map(p => Math.min(...newCents.map(c => distance(p, c) ** 2)));
        const sumDist = dists.reduce((a, b) => a + b, 0);
        let r = Math.random() * sumDist;
        let selected = points[0];
        for (let i = 0; i < points.length; i++) {
          r -= dists[i];
          if (r <= 0) {
            selected = points[i];
            break;
          }
        }
        newCents.push({ ...selected, id: newCents.length, color: CANDY_COLORS[newCents.length % CANDY_COLORS.length] });
      }
    }
    setCentroids(newCents);
    return newCents;
  };

  const performStep = () => {
    let currentCents = centroids;
    if (currentCents.length === 0) {
      currentCents = initCentroids();
      setStepCount(1);
      return true; // Not converged yet
    }

    let activePoints = points;
    
    // Algorithm modifier: Minibatch
    if (algorithm === 'minibatch') {
      const shuffled = [...points].sort(() => 0.5 - Math.random());
      activePoints = shuffled.slice(0, miniBatchSize);
    }

    // Assign Clusters
    let changed = false;
    const newPoints = points.map(p => {
      let bestCluster = 0;
      let minDist = Infinity;
      
      currentCents.forEach((c, idx) => {
        const d = distance(p, c);
        if (d < minDist) {
          minDist = d;
          bestCluster = idx;
        }
      });
      
      if (p.cluster !== bestCluster) changed = true;
      
      // Algorithm modifier: GMM (visual approximation via opacity based on certainty)
      let opacity = 1;
      if (algorithm === 'gmm') {
        const d2 = currentCents[bestCluster === 0 ? 1 : 0] ? distance(p, currentCents[bestCluster === 0 ? 1 : 0]) : Infinity;
        const ratio = minDist / (d2 === 0 ? 0.001 : d2);
        opacity = Math.max(0.2, 1 - ratio);
      }
      
      return { ...p, cluster: bestCluster, opacity };
    });

    // Update Centroids
    const newCents = currentCents.map((c, idx) => {
      const clusterPoints = activePoints.filter(p => newPoints[points.indexOf(p)].cluster === idx);
      if (clusterPoints.length === 0) return c; // keep same if empty

      if (algorithm === 'kmedoids') {
        // Find point in cluster with min sum of distances to other points
        let bestMedoid = clusterPoints[0];
        let minSum = Infinity;
        clusterPoints.forEach(cp1 => {
          const sum = clusterPoints.reduce((acc, cp2) => acc + distance(cp1, cp2), 0);
          if (sum < minSum) {
            minSum = sum;
            bestMedoid = cp1;
          }
        });
        return { ...c, x: bestMedoid.x, y: bestMedoid.y };
      } 
      else {
        // Standard mean (K-Means / Minibatch / GMM approx)
        const sumX = clusterPoints.reduce((sum, p) => sum + p.x, 0);
        const sumY = clusterPoints.reduce((sum, p) => sum + p.y, 0);
        return { 
          ...c, 
          x: sumX / clusterPoints.length, 
          y: sumY / clusterPoints.length 
        };
      }
    });

    const inertia = calculateInertia(newPoints, newCents);
    
    setPoints(newPoints);
    setCentroids(newCents);
    setHistory(prev => [...prev, inertia]);
    setStepCount(s => s + 1);

    if (!changed) {
      setSilhouette(calculateSilhouetteApprox(newPoints, newCents));
      setIsPlaying(false);
    }

    return changed;
  };

  useEffect(() => {
    let timer: number;
    if (isPlaying) {
      timer = window.setTimeout(() => {
        performStep();
      }, 400); // 400ms interval for nice visual drift
    }
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, points, centroids]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-800">
      
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <ScatterChart className="w-8 h-8 text-indigo-500" />
            K-Means <span className="text-slate-400 font-light">& Friends</span>
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Interactive clustering with live inertia analysis</p>
        </div>
        
        {/* Badges */}
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-600">Iter: {stepCount}</span>
          </div>
          <div className={`px-4 py-2 rounded-xl shadow-sm border flex items-center gap-2 transition-all ${silhouette !== null ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
            <BarChart3 className={`w-4 h-4 ${silhouette !== null ? 'text-indigo-500' : 'text-slate-400'}`} />
            <span className="text-sm font-semibold text-slate-600">
              Silh: {silhouette !== null ? silhouette.toFixed(3) : '--'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Controls */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            
            {/* Playback Controls */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${
                  isPlaying 
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                {isPlaying ? <Pause className="w-