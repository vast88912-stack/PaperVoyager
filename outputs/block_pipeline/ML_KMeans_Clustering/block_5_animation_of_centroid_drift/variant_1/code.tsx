import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, StepForward, RotateCcw, Activity } from 'lucide-react';

// --- Constants & Types ---
const CANDY_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#FF9F1C', 
  '#9B5DE5', '#F15BB5', '#00BBF9', '#00F5D4',
  '#F72585', '#7209B7'
];

type Point = { x: number; y: number; cluster: number | null };
type Centroid = { 
  x: number; 
  y: number; 
  targetX: number; 
  targetY: number; 
  history: {x: number, y: number}[];
  color: string;
};

type DatasetType = 'blobs' | 'moons' | 'uniform';
type InitMethod = 'random' | 'kmeans++';

// --- Easing Function for Smooth Drift ---
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

// --- Helper Math ---
const distanceSq = (p1: {x: number, y: number}, p2: {x: number, y: number}) => 
  (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;

// --- Data Generation ---
const generateData = (type: DatasetType, n: number): Point[] => {
  const points: Point[] = [];
  if (type === 'blobs') {
    const centers = [
      { x: 0.3, y: 0.3 }, { x: 0.7, y: 0.3 }, 
      { x: 0.5, y: 0.7 }, { x: 0.2, y: 0.8 }, { x: 0.8, y: 0.8 }
    ];
    for (let i = 0; i < n; i++) {
      const c = centers[i % 5];
      points.push({
        x: c.x + (Math.random() - 0.5) * 0.15,
        y: c.y + (Math.random() - 0.5) * 0.15,
        cluster: null
      });
    }
  } else if (type === 'moons') {
    for (let i = 0; i < n; i++) {
      const isTop = i % 2 === 0;
      const t = Math.random() * Math.PI;
      if (isTop) {
        points.push({
          x: 0.25 + Math.cos(t) * 0.25 + (Math.random() - 0.5) * 0.05,
          y: 0.4 - Math.sin(t) * 0.25 + (Math.random() - 0.5) * 0.05,
          cluster: null
        });
      } else {
        points.push({
          x: 0.5 - Math.cos(t) * 0.25 + (Math.random() - 0.5) * 0.05,
          y: 0.5 + Math.sin(t) * 0.25 + (Math.random() - 0.5) * 0.05,
          cluster: null
        });
      }
    }
  } else {
    for (let i = 0; i < n; i++) {
      points.push({
        x: 0.1 + Math.random() * 0.8,
        y: 0.1 + Math.random() * 0.8,
        cluster: null
      });
    }
  }
  return points;
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // UI State
  const [k, setK] = useState<number>(3);
  const [dataset, setDataset] = useState<DatasetType>('blobs');
  const [initMethod, setInitMethod] = useState<InitMethod>('kmeans++');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [iteration, setIteration] = useState<number>(0);
  const [inertia, setInertia] = useState<number>(0);
  const [isConverged, setIsConverged] = useState<boolean>(false);

  // Simulation State (Refs for animation loop)
  const pointsRef = useRef<Point[]>([]);
  const centroidsRef = useRef<Centroid[]>([]);
  const animationState = useRef({
    isDrifting: false,
    progress: 0,
    converged: false
  });
  const reqRef = useRef<number>();

  // Initialize Data
  const initSimulation = useCallback(() => {
    setIsPlaying(false);
    setIteration(0);
    setInertia(0);
    setIsConverged(false);
    animationState.current = { isDrifting: false, progress: 0, converged: false };

    // 1. Generate Points
    const pts = generateData(dataset, 300);
    pointsRef.current = pts;

    // 2. Initialize Centroids
    const cents: Centroid[] = [];
    if (initMethod === 'random') {
      // Randomly pick k points
      const shuffled = [...pts].sort(() => 0.5 - Math.random());
      for (let i = 0; i < k; i++) {
        cents.push({
          x: shuffled[i].x, y: shuffled[i].y,
          targetX: shuffled[i].x, targetY: shuffled[i].y,
          history: [],
          color: CANDY_COLORS[i % CANDY_COLORS.length]
        });
      }
    } else {
      // KMeans++
      const first = pts[Math.floor(Math.random() * pts.length)];
      cents.push({
        x: first.x, y: first.y, targetX: first.x, targetY: first.y,
        history: [], color: CANDY_COLORS[0]
      });

      for (let i = 1; i < k; i++) {
        const distances = pts.map(p => {
          let minDist = Infinity;
          for (const c of cents) {
            minDist = Math.min(minDist, distanceSq(p, c));
          }
          return minDist;
        });
        
        const totalDist = distances.reduce((a, b) => a + b, 0);
        let r = Math.random() * totalDist;
        let selectedIdx = 0;
        for (let j = 0; j < distances.length; j++) {
          r -= distances[j];
          if (r <= 0) {
            selectedIdx = j;
            break;
          }
        }
        
        cents.push({
          x: pts[selectedIdx].x, y: pts[selectedIdx].y,
          targetX: pts[selectedIdx].x, targetY: pts[selectedIdx].y,
          history: [], color: CANDY_COLORS[i % CANDY_COLORS.length]
        });
      }
    }
    centroidsRef.current = cents;
    draw();
  }, [k, dataset, initMethod]);

  useEffect(() => {
    initSimulation();
  }, [initSimulation]);

  // K-Means Step Logic
  const performStep = useCallback(() => {
    if (animationState.current.converged || animationState.current.isDrifting) return;

    const pts = pointsRef.current;
    const cents = centroidsRef.current;

    // 1. Assign points to nearest centroid
    let currentInertia = 0;
    pts.forEach(p => {
      let minDist = Infinity;
      let closest = -1;
      cents.forEach((c, idx) => {
        const d = distanceSq(p, c);
        if (d < minDist) {
          minDist = d;
          closest = idx;
        }
      });
      p.cluster = closest;
      currentInertia += minDist;
    });
    setInertia(currentInertia);

    // 2. Calculate new centroids
    let moved = false;
    const newTargets = cents.map(() => ({ x: 0, y: 0, count: 0 }));
    
    pts.forEach(p => {
      if (p.cluster !== null) {
        newTargets[p.cluster].x += p.x;
        newTargets[p.cluster].y += p.y;
        newTargets[p.cluster].count += 1;
      }
    });

    cents.forEach((c, i) => {
      if (newTargets[i].count > 0) {
        const tx = newTargets[i].x / newTargets[i].count;
        const ty = newTargets[i].y / newTargets[i].count;
        if (Math.abs(tx - c.x) > 0.0001 || Math.abs(ty - c.y) > 0.0001) {
          moved = true;
          c.targetX = tx;
          c.targetY = ty;
        }
      }
    });

    if (!moved) {
      animationState.current.converged = true;
      setIsConverged(true);
      setIsPlaying(false);
    } else {
      animationState.current.isDrifting = true;
      animationState.current.progress = 0;
      setIteration(prev => prev + 1);
    }
  }, []);

  // Animation Loop
  const animate = useCallback(() => {
    if (animationState.current.isDrifting) {
      animationState.current.progress += 0.03; // Drift speed
      
      const p = animationState.current.progress;
      const eased = easeInOutCubic(Math.min(p, 1));

      centroidsRef.current.forEach(c => {
        c.x = c.x + (c.targetX - c.x) * eased;
        c.y = c.y + (c.targetY - c.y) * eased;
      });

      if (p >= 1) {
        animationState.current.isDrifting = false;
        // Snap to target and record history
        centroidsRef.current.forEach(c => {
          c.history.push({ x: c.x, y: c.y });
          c.x = c.targetX;
          c.y = c.targetY;
        });
      }
    } else if (isPlaying && !animationState.current.converged) {
      performStep();
    }

    draw();
    reqRef.current = requestAnimationFrame(animate);
  }, [isPlaying, performStep]);

  useEffect(() => {
    reqRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqRef.current!);
  }, [animate]);

  // Drawing Logic
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw Points
    pointsRef.current.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2);
      if (p.cluster !== null) {
        ctx.fillStyle = centroidsRef.current[p.cluster].color + '60'; // transparent candy
      } else {
        ctx.fillStyle = '#cbd5e1';
      }
      ctx.fill();
    });

    // Draw Drift Trails
    centroidsRef.current.forEach(c => {
      if (c.history.length > 0) {
        ctx.beginPath();
        ctx.moveTo(c.history[0].x * w, c.history[0].y * h);
        c.history.forEach(pos => {
          ctx.lineTo(pos.x * w, pos.y * h);
        });
        ctx.lineTo(c.x * w, c.y * h);
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    });

    // Draw Centroids
    centroidsRef.current.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x * w, c.y * h, 12, 0, Math.PI * 2);
      ctx.fillStyle = c.color;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(c.x * w, c.y * h, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });
  };

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
          draw();
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // initial size
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {/* Sidebar Controls */}
      <div className="w-80 bg-white border-r border-slate-200 p-6 flex flex-col gap-6 shadow-sm z-10 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 mb-1">
            Centroid Drift
          </h1>
          <p className="text-sm text-slate-500">K-Means Animation Lab</p>
        </div>

        {/* Dataset Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Dataset</label>
          <div className="grid grid-cols-3 gap-2">
            {(['blobs', 'moons', 'uniform'] as DatasetType[]).map(d => (
              <button
                key={d}
                onClick={() => setDataset(d)}
                className={`py-2 text-xs font-medium rounded-md border transition-colors ${
                  dataset === d 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* K Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Clusters (K)</label>
            <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{k}</span>
          </div>
          <input 
            type="range" 
            min="2" max="10" 
            value={k} 
            onChange={(e) => setK(parseInt(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>

        {/* Initialization */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Initialization</label>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {(['random', 'kmeans++'] as InitMethod[]).map(m => (
              <button
                key={m}
                onClick={() => setInitMethod(m)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                  initMethod === m 
                    ? 'bg-white shadow-sm text-indigo-600' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m === 'random' ? 'Random' : 'K-Means++'}
              </button>
            ))}
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Playback Controls */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={isConverged}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
                isConverged 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : isPlaying 
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button 
              onClick={performStep}
              disabled={isPlaying || isConverged}
              className="px-4 bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center"
              title="Step Forward"
            >
              <StepForward size={18} />
            </button>
            <button 
              onClick={initSimulation}
              className="px-4 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center"
              title="Reset"
            >
              <RotateCcw size={18} />
            </button>
          </div>
          
          {isConverged && (
            <div className="text-center text-sm font-medium text-emerald-600 bg-emerald-50 py-2 rounded-lg border border-emerald-100">
              Converged in {iteration} iterations!
            </div>
          )}
        </div>

        <div className="mt-auto pt-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Iteration</span>
              <span className="text-sm font-mono font-medium text-slate-800">{iteration}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                <Activity size={12} /> Inertia
              </span>
              <span className="text-sm font-mono font-medium text-slate-800">
                {inertia === 0 ? '-' : inertia.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative bg-slate-50 p-6 flex flex-col">
        <div className="flex-1 w-full relative bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full"
            style={{ cursor: 'crosshair' }}
          />
          
          {/* Legend Overlay */}
          <div className="absolute top-4 left-4 flex gap-2">
            <div className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-slate-100 text-xs font-medium text-slate-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-300"></span> Unassigned
            </div>
            <div className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-slate-100 text-xs font-medium text-slate-600 flex items-center gap-2">
              <span className="