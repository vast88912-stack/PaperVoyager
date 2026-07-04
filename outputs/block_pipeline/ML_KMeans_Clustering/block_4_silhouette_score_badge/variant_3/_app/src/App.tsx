import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// --- Types & Interfaces ---
interface Point {
  x: number;
  y: number;
  cluster: number;
}

interface Centroid {
  x: number;
  y: number;
}

// --- Candy Color Palette ---
const CANDY_COLORS = [
  '#F472B6', // Pink 400
  '#22D3EE', // Cyan 400
  '#FBBF24', // Amber 400
  '#A78BFA', // Violet 400
  '#34D399', // Emerald 400
];

// --- Math & Distance Helpers ---
const dist = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
  Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

// Generate random blobs
const generateBlobs = (k: number, pointsPerCluster: number): Point[] => {
  const points: Point[] = [];
  const centers = Array.from({ length: k }, () => ({
    x: 20 + Math.random() * 60, // Keep away from edges (0-100 canvas)
    y: 20 + Math.random() * 60,
  }));

  centers.forEach((center, _idx) => {
    for (let i = 0; i < pointsPerCluster; i++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
      
      points.push({
        x: Math.max(0, Math.min(100, center.x + z0 * 6)),
        y: Math.max(0, Math.min(100, center.y + z1 * 6)),
        cluster: -1, // Unassigned
      });
    }
  });
  return points;
};

// Silhouette Score Calculation O(N^2)
const calculateSilhouette = (points: Point[], centroids: Centroid[]): number => {
  if (centroids.length < 2 || points.length === 0) return 0;
  
  let totalSil = 0;
  let validPoints = 0;
  const clusters = centroids.map((_, i) => points.filter(p => p.cluster === i));

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.cluster === -1) continue;

    const myCluster = clusters[p.cluster];
    if (myCluster.length <= 1) {
      continue; // Silhouette score is 0 for singleton, omit or add 0.
    }

    // a(i) - mean intra-cluster distance
    let a = 0;
    for (let j = 0; j < myCluster.length; j++) {
      a += dist(p, myCluster[j]);
    }
    a /= (myCluster.length - 1);

    // b(i) - min mean nearest-cluster distance
    let b = Infinity;
    for (let c = 0; c < clusters.length; c++) {
      if (c === p.cluster) continue;
      const otherCluster = clusters[c];
      if (otherCluster.length === 0) continue;

      let avgDist = 0;
      for (let j = 0; j < otherCluster.length; j++) {
        avgDist += dist(p, otherCluster[j]);
      }
      avgDist /= otherCluster.length;
      if (avgDist < b) b = avgDist;
    }

    const s = (b - a) / Math.max(a, b);
    totalSil += s;
    validPoints++;
  }

  return validPoints > 0 ? totalSil / validPoints : 0;
};

// --- Sub-components ---

// Icons
const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const RefreshIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
    <path d="M3 3v5h5"></path>
  </svg>
);

// Focus Feature: Silhouette Score Badge Variant #4
const SilhouetteBadge = ({ score, history }: { score: number, history: number[] }) => {
  const getScoreProfile = (s: number) => {
    if (s < 0) return { label: 'Poor', color: 'text-rose-500', bg: 'bg-rose-500', glow: 'shadow-rose-500/40' };
    if (s < 0.25) return { label: 'Fair', color: 'text-amber-500', bg: 'bg-amber-500', glow: 'shadow-amber-500/40' };
    if (s < 0.5) return { label: 'Good', color: 'text-emerald-500', bg: 'bg-emerald-500', glow: 'shadow-emerald-500/40' };
    return { label: 'Excellent', color: 'text-violet-500', bg: 'bg-violet-500', glow: 'shadow-violet-500/40' };
  };

  const profile = getScoreProfile(score);
  
  // Normalized for plotting sparkline
  const sparkPoints = history.map((val, idx) => {
    const x = history.length > 1 ? (idx / (history.length - 1)) * 100 : 100;
    // Map -1 to 1 into 100 to 0 (SVG y-axis is inverted)
    const y = 100 - ((val + 1) / 2) * 100; 
    return `${x},${y}`;
  }).join(' ');

  // Calculate percentage for the gauge (-1 to 1 mapped to 0% to 100%)
  const gaugePercent = ((score + 1) / 2) * 100;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-6 relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60">
      {/* Background Decor */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-violet-100 to-fuchsia-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
      
      {/* Header */}
      <div className="flex justify-between items-start z-10">
        <div>
          <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2">
            Silhouette Score
            <div className="group relative cursor-help">
              <InfoIcon />
              <div className="absolute hidden group-hover:block bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-slate-800 text-white text-xs p-3 rounded-xl shadow-2xl z-50">
                Measures how similar an object is to its own cluster (cohesion) compared to other clusters (separation). Ranges from -1 to +1.
                <div className="mt-2 text-slate-300 font-mono text-[10px] bg-slate-900 p-2 rounded-md">
                  S = (b - a) / max(a, b)
                </div>
              </div>
            </div>
          </h3>
          <div className="flex items-baseline gap-3 mt-1">
            <span className={`text-6xl font-black tabular-nums tracking-tighter transition-colors duration-500 ${profile.color}`}>
              {score.toFixed(3)}
            </span>
            <div className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg transition-colors duration-500 ${profile.bg} ${profile.glow}`}>
              {profile.label}
            </div>
          </div>
        </div>
      </div>

      {/* Main Gauge */}
      <div className="z-10 mt-2">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-2 px-1">
          <span>-1 (Incorrect)</span>
          <span>0 (Overlapping)</span>
          <span>+1 (Dense & Separated)</span>
        </div>
        <div className="relative h-4 w-full bg-slate-100 rounded-full overflow-visible shadow-inner">
          {/* Gradient Track */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-violet-500 opacity-80" />
          
          {/* Track Markers */}
          <div className="absolute left-[50%] top-0 bottom-0 w-px bg-white/50" />
          
          {/* The Marker */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-6 bg-white border-[3px] border-slate-800 rounded-full shadow-[0_0_12px_rgba(0,0,0,0.3)] transition-all duration-700 ease-out z-20"
            style={{ left: `calc(${gaugePercent}% - 8px)` }}
          >
            <div className={`absolute inset-0 rounded-full opacity-40 animate-ping ${profile.bg}`} />
          </div>
        </div>
      </div>

      {/* Sparkline History Chart */}
      <div className="mt-4 pt-4 border-t border-slate-50 z-10">
        <div className="flex justify-between items-end mb-2">
          <span className="text-xs font-semibold text-slate-500">Optimization Trend</span>
          <span className="text-[10px] text-slate-400 font-mono">Iter: {history.length - 1}</span>
        </div>
        <div className="h-16 w-full bg-slate-50/50 rounded-xl relative overflow-hidden border border-slate-100">
          {/* Guide lines */}
          <div className="absolute top-1/2 left-0 right-0 border-t border-slate-200 border-dashed" />
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <polyline
              points={sparkPoints}
              fill="none"
              stroke="url(#trendGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#94A3B8" />
                <stop offset="100%" stopColor="#A78BFA" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
};

// --- Main Application ---
export default function App() {
  const [k, setK] = useState(3);
  const [points, setPoints] = useState<Point[]>([]);
  const [centroids, setCentroids] = useState<Centroid[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // Initialize Data
  const initBoard = useCallback(() => {
    const newPoints = generateBlobs(k, 30);
    setPoints(newPoints);
    
    // Random Init
    const newCentroids = Array.from({ length: k }, () => {
      const p = newPoints[Math.floor(Math.random() * newPoints.length)];
      return { x: p.x, y: p.y };
    });
    setCentroids(newCentroids);
    
    // Initial assignment & score
    const updatedPoints = assignPoints(newPoints, newCentroids);
    setPoints(updatedPoints);
    const initialScore = calculateSilhouette(updatedPoints, newCentroids);
    setHistory([initialScore]);
    setIsAnimating(false);
  }, [k]);

  useEffect(() => {
    initBoard();
  }, [initBoard]);

  // K-Means Step
  const assignPoints = (pts: Point[], cents: Centroid[]) => {
    return pts.map(p => {
      let minDist = Infinity;
      let cluster = -1;
      cents.forEach((c, i) => {
        const d = dist(p, c);
        if (d < minDist) {
          minDist = d;
          cluster = i;
        }
      });
      return { ...p, cluster };
    });
  };

  const stepKMeans = useCallback(() => {
    setCentroids(prevCents => {
      const newCents = prevCents.map((c, i) => {
        const clusterPoints = points.filter(p => p.cluster === i);
        if (clusterPoints.length === 0) return c; // Handle empty cluster
        const sumX = clusterPoints.reduce((sum, p) => sum + p.x, 0);
        const sumY = clusterPoints.reduce((sum, p) => sum + p.y, 0);
        return { x: sumX / clusterPoints.length, y: sumY / clusterPoints.length };
      });
      
      const newPoints = assignPoints(points, newCents);
      setPoints(newPoints);
      
      const score = calculateSilhouette(newPoints, newCents);
      setHistory(h => [...h, score]);
      
      return newCents;
    });
  }, [points]);

  // Animation Loop
  useEffect(() => {
    let timer: number;
    if (isAnimating) {
      timer = window.setInterval(() => {
        stepKMeans();
      }, 600); // 600ms per step to allow viewing the drift
    }
    return () => clearInterval(timer);
  }, [isAnimating, stepKMeans]);


  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-pink-200">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-pink-500 flex items-center justify-center text-white font-bold shadow-md shadow-pink-200">
            K
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            K-Means <span className="text-slate-400 font-light">& Friends Lab</span>
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Canvas & Controls */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Canvas Wrapper */}
          <div className="bg-white rounded-3xl p-4 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-4">
            
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between px-2">
              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                  Clusters (k):
                  <input 
                    type="range" 
                    min="2" max="5" 
                    value={k}
                    onChange={(e) => setK(Number(e.target.value))}
                    className="w-24 accent-violet-500"
                  />
                  <span className="tabular-nums w-4">{k}</span>
                </label>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={initBoard}
                  className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-2"
                >
                  <RefreshIcon /> Reset
                </button>
                <button 
                  onClick={() => {
                    if(!isAnimating) stepKMeans();
                    setIsAnimating(!isAnimating);
                  }}
                  className={`px-5 py-2 text-sm font-bold text-white rounded-xl transition-all shadow-lg flex items-center gap-2
                    ${isAnimating 
                      ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30' 
                      : 'bg-violet-500 hover:bg-violet-600 shadow-violet-500/30'
                    }`}
                >
                  {isAnimating ? (
                     <><