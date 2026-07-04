import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, StepForward, RotateCcw, RefreshCw, Activity } from 'lucide-react';

// --- Constants & Helpers ---
const CANVAS_SIZE = 800;
const CANDY_COLORS = [
  '#FF6B6B', // Pink
  '#4ECDC4', // Mint
  '#FFE66D', // Yellow
  '#9D4EDD', // Purple
  '#FF9F1C', // Orange
  '#2EC4B6', // Teal
  '#FF99C8', // Light Pink
  '#A9DEF9', // Light Blue
];

// Box-Muller transform for normally distributed random numbers
const randomNormal = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

const generateBlobs = (numPoints: number, numBlobs: number) => {
  const points = [];
  const centers = Array.from({ length: numBlobs }, () => ({
    x: 150 + Math.random() * (CANVAS_SIZE - 300),
    y: 150 + Math.random() * (CANVAS_SIZE - 300),
  }));

  for (let i = 0; i < numPoints; i++) {
    const center = centers[i % numBlobs];
    points.push({
      id: i,
      x: Math.max(20, Math.min(CANVAS_SIZE - 20, center.x + randomNormal() * 45)),
      y: Math.max(20, Math.min(CANVAS_SIZE - 20, center.y + randomNormal() * 45)),
    });
  }
  return points;
};

const euclideanDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

// --- Types ---
type Point = { id: number; x: number; y: number };
type Centroid = { id: number; x: number; y: number; color: string };

// --- Main Component ---
export default function App() {
  const [k, setK] = useState(4);
  const [points, setPoints] = useState<Point[]>([]);
  const [centroids, setCentroids] = useState<Centroid[]>([]);
  const [centroidHistory, setCentroidHistory] = useState<{ x: number; y: number }[][]>([]);
  const [assignments, setAssignments] = useState<number[]>([]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<'assign' | 'update'>('assign');
  const [iteration, setIteration] = useState(0);
  const [isConverged, setIsConverged] = useState(false);
  const [speed, setSpeed] = useState(600);

  // Initialize Data
  const initData = useCallback((numClusters: number, regeneratePoints = false) => {
    setIsPlaying(false);
    setIsConverged(false);
    setPhase('assign');
    setIteration(0);

    let currentPoints = points;
    if (regeneratePoints || points.length === 0) {
      currentPoints = generateBlobs(300, numClusters);
      setPoints(currentPoints);
    }

    const initialCentroids = Array.from({ length: numClusters }, (_, i) => ({
      id: i,
      x: 50 + Math.random() * (CANVAS_SIZE - 100),
      y: 50 + Math.random() * (CANVAS_SIZE - 100),
      color: CANDY_COLORS[i % CANDY_COLORS.length],
    }));

    setCentroids(initialCentroids);
    setCentroidHistory(initialCentroids.map((c) => [{ x: c.x, y: c.y }]));
    setAssignments(new Array(currentPoints.length).fill(-1));
  }, [points]);

  // Initial load
  useEffect(() => {
    initData(k, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle K change
  useEffect(() => {
    initData(k, true);
  }, [k, initData]);

  // Algorithm Step
  const step = useCallback(() => {
    if (isConverged) {
      setIsPlaying(false);
      return;
    }

    if (phase === 'assign') {
      let changed = false;
      const newAssignments = points.map((p, i) => {
        let minDist = Infinity;
        let minIdx = -1;
        centroids.forEach((c, cIdx) => {
          const dist = euclideanDistance(p, c);
          if (dist < minDist) {
            minDist = dist;
            minIdx = cIdx;
          }
        });
        if (assignments[i] !== minIdx) changed = true;
        return minIdx;
      });

      setAssignments(newAssignments);
      setPhase('update');
      
      if (!changed && iteration > 0) {
        setIsConverged(true);
        setIsPlaying(false);
      }
    } else {
      const newCentroids = centroids.map((c, cIdx) => {
        const assignedPoints = points.filter((_, i) => assignments[i] === cIdx);
        if (assignedPoints.length === 0) return c; 
        const sumX = assignedPoints.reduce((sum, p) => sum + p.x, 0);
        const sumY = assignedPoints.reduce((sum, p) => sum + p.y, 0);
        return {
          ...c,
          x: sumX / assignedPoints.length,
          y: sumY / assignedPoints.length,
        };
      });

      setCentroidHistory((prev) =>
        prev.map((hist, i) => [...hist, { x: newCentroids[i].x, y: newCentroids[i].y }])
      );
      setCentroids(newCentroids);
      setPhase('assign');
      setIteration((prev) => prev + 1);
    }
  }, [points, centroids, assignments, phase, isConverged, iteration]);

  // Animation Loop
  useEffect(() => {
    let timer: number;
    if (isPlaying && !isConverged) {
      timer = window.setTimeout(step, speed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, isConverged, step, speed]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center py-8 px-4">
      {/* Header */}
      <div className="max-w-5xl w-full flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Activity className="w-8 h-8 text-indigo-500" />
            Centroid Drift Animation
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Watch K-Means centroids hunt for the center of mass in real-time.
          </p>
        </div>
        
        {/* Status Badge */}
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Status</span>
            <span className={`text-sm font-bold ${isConverged ? 'text-emerald-500' : isPlaying ? 'text-indigo-500' : 'text-amber-500'}`}>
              {isConverged ? 'Converged' : isPlaying ? 'Computing...' : 'Paused'}
            </span>
          </div>
          <div className="w-px h-8 bg-slate-100 mx-2"></div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Iteration</span>
            <span className="text-sm font-bold text-slate-700">{iteration}</span>
          </div>
          <div className="w-px h-8 bg-slate-100 mx-2"></div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Phase</span>
            <span className="text-sm font-bold text-slate-700 capitalize">{phase}</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Controls Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-6">
            
            {/* Playback Controls */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Playback</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={isConverged}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${
                    isConverged
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : isPlaying
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-md hover:shadow-lg'
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={step}
                  disabled={isPlaying || isConverged}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <StepForward className="w-4 h-4" />
                  Step
                </button>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Parameters */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Parameters</h3>
              
              <div className="mb-5">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">Clusters (k)</label>
                  <span className="text-sm font-bold text-indigo-500">{k}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="8"
                  value={k}
                  onChange={(e) => setK(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">Speed</label>
                  <span className="text-sm font-bold text-indigo-500">{speed}ms</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1500"
                  step="100"
                  value={speed}
                  onChange={(e) => setSpeed(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  style={{ direction: 'rtl' }} // Faster = lower ms = right side
                />
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Actions */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Actions</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => initData(k, false)}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restart Init
                </button>
                <button
                  onClick={() => initData(k, true)}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  New Data
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Visualization Canvas */}
        <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative flex items-center justify-center p-4">
          <svg
            viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
            className="w-full h-auto max-h-[700px] rounded-2xl bg-slate-50/50"
            style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.02))' }}
          >
            {/* Grid Background */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Drift Trails (History) */}
            {centroidHistory.map((history, i) => {
              if (history.length < 2) return null;
              const pointsStr = history.map((p) => `${p.x},${p.y}`).join(' ');
              return (
                <g key={`trail-${i}`}>
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke={centroids[i]?.color || '#000'}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.3"
                    className="transition-all duration-500 ease-in-out"
                  />
                  {/* Small dots at historical positions */}
                  {history.map((p, j) => (
                    <circle
                      key={`hist-${i}-${j}`}
                      cx={p.x}
                      cy={p.y}
                      r="3"
                      fill={centroids[i]?.color || '#000'}
                      opacity={j === history.length - 1 ? 0 : 0.4}
                    />
                  ))}
                </g>
              );
            })}

            {/* Data Points */}
            {points.map((p, i) => {
              const assignedCentroid = assignments[i] !== -1 ? centroids[assignments[i]] : null;
              const color = assignedCentroid ? assignedCentroid.color : '#cbd5e1';
              return (
                <circle
                  key={`p-${p.id}`}
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  fill={color}
                  opacity="0.8"
                  className="transition-colors duration-500 ease-in-out"
                />
              );
            })}

            {/* Centroids */}
            {centroids.map((c) => (
              <g
                key={`c-${c.id}`}
                style={{
                  transform: `translate(${c.x}px, ${c.y}px)`,
                  transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {/* Pulse effect if active */}
                {!isConverged && (
                  <circle
                    cx="0"
                    cy="0"
                    r="24"
                    fill={c.color}
                    opacity="0.2"
                    className="animate-pulse"
                  />
                )}
                {/* Outer Ring */}
                <circle
                  cx="0"
                  cy="0"
                  r="12"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                />
                {/* Inner Core */}
                <circle
                  cx="0"
                  cy="0"
                  r="10"
                  fill={c.color}
                  stroke="#1e293b"
                  strokeWidth="2"
                />
                {/* Crosshair */}
                <path
                  d="M -6 0 L 6 0 M 0 -6 L 0 6"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            ))}
          </svg>

          {/* Overlay when converged */}
          {isConverged && (
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white px-6 py-2 rounded-full font-bold shadow-lg animate-bounce">
              Convergence Reached!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}