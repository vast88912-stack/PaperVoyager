import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, StepForward, Shuffle, Target, Zap, Info } from 'lucide-react';

// --- Constants & Types ---
const CANDY_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#9D4EDD', '#FF9F1C', '#38B000'];
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const NUM_POINTS = 250;

type Point = { id: number; x: number; y: number };
type Centroid = Point & { color: string };
type InitMethod = 'random' | 'kmeans++' | 'farthest';

// --- Helpers ---
const distSq = (p1: Point, p2: Point) => Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
const dist = (p1: Point, p2: Point) => Math.sqrt(distSq(p1, p2));

const generateBlobs = (numPoints: number, numBlobs: number): Point[] => {
  const points: Point[] = [];
  const centers = Array.from({ length: numBlobs }, () => ({
    x: 100 + Math.random() * (CANVAS_WIDTH - 200),
    y: 100 + Math.random() * (CANVAS_HEIGHT - 200),
  }));

  for (let i = 0; i < numPoints; i++) {
    const center = centers[i % numBlobs];
    // Box-Muller transform for normal distribution
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    const z2 = Math.sqrt(-2.0 * Math.log(u)) * Math.sin(2.0 * Math.PI * v);
    
    points.push({
      id: i,
      x: Math.max(20, Math.min(CANVAS_WIDTH - 20, center.x + z * 40)),
      y: Math.max(20, Math.min(CANVAS_HEIGHT - 20, center.y + z2 * 40)),
    });
  }
  return points;
};

export default function App() {
  const [points, setPoints] = useState<Point[]>([]);
  const [centroids, setCentroids] = useState<Centroid[]>([]);
  const [k, setK] = useState<number>(4);
  const [method, setMethod] = useState<InitMethod>('kmeans++');
  const [status, setStatus] = useState<'idle' | 'initializing' | 'done'>('idle');
  const [distances, setDistances] = useState<number[]>([]);
  const [probabilities, setProbabilities] = useState<number[]>([]);
  const [targetPointId, setTargetPointId] = useState<number | null>(null);

  // --- Initialization Logic ---
  const initDataset = useCallback(() => {
    setPoints(generateBlobs(NUM_POINTS, Math.floor(Math.random() * 3) + 3));
    setCentroids([]);
    setStatus('idle');
    setDistances([]);
    setProbabilities([]);
    setTargetPointId(null);
  }, []);

  useEffect(() => {
    initDataset();
  }, [initDataset]);

  const resetInit = () => {
    setCentroids([]);
    setStatus('idle');
    setDistances([]);
    setProbabilities([]);
    setTargetPointId(null);
  };

  const computeDistances = (currentCentroids: Centroid[], pts: Point[]) => {
    if (currentCentroids.length === 0) return { dists: [], probs: [], target: null };
    
    const dists = pts.map(p => {
      let minDist = Infinity;
      for (const c of currentCentroids) {
        const d = method === 'kmeans++' ? distSq(p, c) : dist(p, c);
        if (d < minDist) minDist = d;
      }
      return minDist;
    });

    let probs: number[] = [];
    let target: number | null = null;

    if (method === 'kmeans++') {
      const sumDist = dists.reduce((a, b) => a + b, 0);
      probs = dists.map(d => (sumDist > 0 ? d / sumDist : 0));
    } else if (method === 'farthest') {
      let maxDist = -1;
      let maxIdx = -1;
      dists.forEach((d, i) => {
        if (d > maxDist) {
          maxDist = d;
          maxIdx = i;
        }
      });
      target = pts[maxIdx].id;
    }

    return { dists, probs, target };
  };

  const stepInit = () => {
    if (status === 'done' || centroids.length >= k) return;

    let nextCentroid: Centroid;
    const color = CANDY_COLORS[centroids.length];

    if (centroids.length === 0) {
      // First centroid is always random
      const randomPt = points[Math.floor(Math.random() * points.length)];
      nextCentroid = { ...randomPt, color };
    } else {
      if (method === 'random') {
        // Pick random point not already a centroid
        const available = points.filter(p => !centroids.some(c => c.id === p.id));
        const randomPt = available[Math.floor(Math.random() * available.length)];
        nextCentroid = { ...randomPt, color };
      } else if (method === 'kmeans++') {
        // Pick based on probability proportional to D(x)^2
        const r = Math.random();
        let cumulative = 0;
        let selectedIdx = probabilities.length - 1;
        for (let i = 0; i < probabilities.length; i++) {
          cumulative += probabilities[i];
          if (r <= cumulative) {
            selectedIdx = i;
            break;
          }
        }
        nextCentroid = { ...points[selectedIdx], color };
      } else {
        // Farthest First: pick the target
        const targetPt = points.find(p => p.id === targetPointId) || points[0];
        nextCentroid = { ...targetPt, color };
      }
    }

    const newCentroids = [...centroids, nextCentroid];
    setCentroids(newCentroids);

    if (newCentroids.length === k) {
      setStatus('done');
      setDistances([]);
      setProbabilities([]);
      setTargetPointId(null);
    } else {
      setStatus('initializing');
      const { dists, probs, target } = computeDistances(newCentroids, points);
      setDistances(dists);
      setProbabilities(probs);
      setTargetPointId(target);
    }
  };

  const autoRun = () => {
    let currentCentroids = [...centroids];
    let currentStatus = status;
    
    while (currentCentroids.length < k) {
      const color = CANDY_COLORS[currentCentroids.length];
      let nextCentroid: Centroid;

      if (currentCentroids.length === 0) {
        const randomPt = points[Math.floor(Math.random() * points.length)];
        nextCentroid = { ...randomPt, color };
      } else {
        const { dists, probs, target } = computeDistances(currentCentroids, points);
        
        if (method === 'random') {
          const available = points.filter(p => !currentCentroids.some(c => c.id === p.id));
          const randomPt = available[Math.floor(Math.random() * available.length)];
          nextCentroid = { ...randomPt, color };
        } else if (method === 'kmeans++') {
          const r = Math.random();
          let cumulative = 0;
          let selectedIdx = probs.length - 1;
          for (let i = 0; i < probs.length; i++) {
            cumulative += probs[i];
            if (r <= cumulative) {
              selectedIdx = i;
              break;
            }
          }
          nextCentroid = { ...points[selectedIdx], color };
        } else {
          const targetPt = points.find(p => p.id === target) || points[0];
          nextCentroid = { ...targetPt, color };
        }
      }
      currentCentroids.push(nextCentroid);
    }
    
    setCentroids(currentCentroids);
    setStatus('done');
    setDistances([]);
    setProbabilities([]);
    setTargetPointId(null);
  };

  // --- Render Helpers ---
  const getPointRadius = (idx: number) => {
    if (status !== 'initializing') return 4;
    if (method === 'kmeans++' && probabilities.length > 0) {
      const maxProb = Math.max(...probabilities);
      if (maxProb === 0) return 4;
      // Scale radius between 3 and 12 based on probability
      return 3 + (probabilities[idx] / maxProb) * 9;
    }
    return 4;
  };

  const getPointOpacity = (idx: number) => {
    if (status !== 'initializing') return 0.6;
    if (method === 'kmeans++' && probabilities.length > 0) {
      const maxProb = Math.max(...probabilities);
      if (maxProb === 0) return 0.6;
      return 0.3 + (probabilities[idx] / maxProb) * 0.7;
    }
    if (method === 'farthest' && targetPointId !== null) {
      return points[idx].id === targetPointId ? 1 : 0.4;
    }
    return 0.6;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 flex items-center justify-center">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* --- Sidebar Controls --- */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-8">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 mb-2">
              Init Choices
            </h1>
            <p className="text-sm text-slate-500">
              Explore how K-Means++, Random, and Farthest First select their initial cluster centroids.
            </p>
          </div>

          <div className="space-y-6">
            {/* K Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700">Clusters (K)</label>
                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">{k}</span>
              </div>
              <input
                type="range"
                min="2"
                max="6"
                value={k}
                onChange={(e) => {
                  setK(parseInt(e.target.value));
                  resetInit();
                }}
                className="w-full accent-violet-500"
              />
            </div>

            {/* Method Selector */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Initialization Method</label>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'random', name: 'Random', icon: Shuffle, desc: 'Uniformly random choice' },
                  { id: 'kmeans++', name: 'K-Means++', icon: Zap, desc: 'Proportional to D(x)²' },
                  { id: 'farthest', name: 'Farthest First', icon: Target, desc: 'Maximizes min distance' }
                ].map((m) => {
                  const Icon = m.icon;
                  const isActive = method === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setMethod(m.id as InitMethod);
                        resetInit();
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        isActive 
                          ? 'border-violet-500 bg-violet-50 shadow-sm ring-1 ring-violet-500' 
                          : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isActive ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${isActive ? 'text-violet-900' : 'text-slate-700'}`}>{m.name}</div>
                        <div className="text-xs text-slate-500">{m.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-auto space-y-3 pt-6 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={stepInit}
                disabled={status === 'done'}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl transition-colors"
              >
                <StepForward size={16} />
                Step
              </button>
              <button
                onClick={autoRun}
                disabled={status === 'done'}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl transition-colors"
              >
                <Play size={16} />
                Run All
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={resetInit}
                className="flex items-center justify-center gap-2 py-2 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl transition-colors"
              >
                <RotateCcw size={14} />
                Clear
              </button>
              <button
                onClick={initDataset}
                className="flex items-center justify-center gap-2 py-2 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl transition-colors"
              >
                <Shuffle size={14} />
                New Data
              </button>
            </div>
          </div>
        </div>

        {/* --- Main Visualization Area --- */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Canvas */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative aspect-video flex-shrink-0">
            <svg 
              viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} 
              className="w-full h-full"
              style={{ background: 'radial-gradient(circle at center, #f8fafc 0%, #f1f5f9 100%)' }}
            >
              {/* Distance Connections (Farthest First visualization) */}
              {status === 'initializing' && method === 'farthest' && targetPointId !== null && centroids.length > 0 && (
                <g className="opacity-30">
                  {centroids.map(c => {
                    const target = points.find(p => p.id === targetPointId);
                    if (!target) return null;
                    return (
                      <line 
                        key={`line-${c.id}`}
                        x1={c.x} y1={c.y} x2={target.x} y2={target.y}
                        stroke={c.color} strokeWidth="2" strokeDasharray="4 4"
                      />
                    );
                  })}
                </g>
              )}

              {/* Data Points */}
              {points.map((p, idx) => {
                const isTarget = p.id === targetPointId;
                const r = getPointRadius(idx);
                const opacity = getPointOpacity(idx);
                
                return (
                  <g key={`pt-${p.id}`}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={r}
                      fill="#94a3b8"
                      opacity={opacity}
                      className="transition-all duration-300 ease-out"
                    />
                    {/* Highlight target point in Farthest First */}
                    {isTarget && method === 'farthest' && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={12}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        className="animate-ping origin-center"
                        style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                      />
                    )}
                  </g>
                );
              })}

              {/* Centroids */}
              {centroids.map((c, i) => (
                <g key={`cent-${i}`} className="animate-bounce-in" style={{ transformOrigin: `${c.x}px ${c.y}px` }}>
                  {/* Outer glow */}
                  <circle cx={c.x} cy={c.y} r={16} fill={c.color} opacity="0.2" />
                  {/* Inner marker */}
                  <path
                    d={`M ${c.x} ${c.y - 10} L ${c.x + 10} ${c.y + 10} L ${c.x - 10} ${c.y + 10} Z`}
                    fill={c.color}
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <text x={c.x} y={c.y + 4} fontSize="10" fill="#fff" textAnchor="middle" fontWeight="bold">
                    {i + 1}
                  </text>
                </g>
              ))}
            </svg>

            {/* Status Overlay */}
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-slate-200 flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${status === 'done' ? 'bg-green-500' : status === 'initializing' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
              <span className="text-sm font-bold text-slate-700">
                {status === 'idle' ? 'Ready to initialize' : 
                 status === 'initializing' ? `Placing centroid ${centroids.length + 1} of ${k}...` : 
                 'Initialization Complete'}
              </span>
            </div>
          </div>

          {/* Explanation Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex gap-4 items-start">
            <div className="p-3 bg-blue-50 text-blue-500 rounded-xl shrink-0">
              <Info size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                {method === 'random' && 'Random Initialization'}
                {method === 'kmeans++' && 'K-Means++ Initialization'}
                {method === 'farthest' && 'Farthest First Initialization'}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {method === 'random' && 'Selects initial centroids completely at random from the dataset. While fast, this can lead to poor clustering if initial points are grouped too closely together.'}
                {method === 'kmeans++' && 'The first centroid is chosen randomly. Subsequent centroids are chosen from remaining points with a probability proportional to their squared distance to the nearest existing centroid. Larger points on the canvas indicate higher probability!'}
                {method === 'farthest' && 'The first centroid is chosen randomly. Each subsequent centroid is the point that is furthest away from its nearest existing centroid (maximizing the minimum distance). The target reticle shows the exact next point to be chosen.'}
              </p>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .animate-bounce-in {
          animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}