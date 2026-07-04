import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  SlidersHorizontal, Info, Sparkles, Play, RotateCcw, Shuffle, Target, Zap,
  CheckCircle2, AlertTriangle, XCircle, Activity, ChevronRight, Pause, StepForward, RefreshCw
} from 'lucide-react';

// --- Shared Math Helpers ---
const randomGaussian = (mean = 0, stdev = 1) => {
  let u = 1 - Math.random();
  let v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
};

const distSq = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
  Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);

const dist = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
  Math.sqrt(distSq(p1, p2));

// --- Shared Constants ---
const SHARED_COLORS = [
  '#FF499E', // Pink
  '#00E5FF', // Cyan
  '#FFD166', // Yellow
  '#A06CD5', // Purple
  '#FF9F1C', // Orange
  '#00F5D4', // Mint
  '#F15BB5', // Light Pink
  '#38B000', // Green
];

// ==========================================
// MODULE 1: Point Cloud Canvas
// ==========================================
type PointCloudPoint = { x: number; y: number; cluster: number };
type Preset = 'blobs' | 'moons' | 'concentric';

const generateCanvasBlobs = (n: number, noise: number, centers = 3): PointCloudPoint[] => {
  const points: PointCloudPoint[] = [];
  const clusterCenters = Array.from({ length: centers }, () => ({
    x: (Math.random() * 1.6 - 0.8),
    y: (Math.random() * 1.6 - 0.8),
  }));
  for (let i = 0; i < n; i++) {
    const cluster = i % centers;
    const center = clusterCenters[cluster];
    points.push({
      x: randomGaussian(center.x, noise),
      y: randomGaussian(center.y, noise),
      cluster,
    });
  }
  return points;
};

const generateMoons = (n: number, noise: number): PointCloudPoint[] => {
  const points: PointCloudPoint[] = [];
  for (let i = 0; i < n; i++) {
    const cluster = i % 2;
    const theta = Math.random() * Math.PI;
    if (cluster === 0) {
      points.push({
        x: (Math.cos(theta) - 0.5) * 0.8 + randomGaussian(0, noise),
        y: (Math.sin(theta) - 0.25) * 0.8 + randomGaussian(0, noise),
        cluster,
      });
    } else {
      points.push({
        x: (1 - Math.cos(theta) - 0.5) * 0.8 + randomGaussian(0, noise),
        y: (0.5 - Math.sin(theta) - 0.25) * 0.8 + randomGaussian(0, noise),
        cluster,
      });
    }
  }
  return points;
};

const generateConcentric = (n: number, noise: number, rings = 2): PointCloudPoint[] => {
  const points: PointCloudPoint[] = [];
  for (let i = 0; i < n; i++) {
    const cluster = i % rings;
    const radius = 0.3 + (cluster * 0.5);
    const theta = Math.random() * 2 * Math.PI;
    points.push({
      x: radius * Math.cos(theta) + randomGaussian(0, noise),
      y: radius * Math.sin(theta) + randomGaussian(0, noise),
      cluster,
    });
  }
  return points;
};

function ModulePointCloud() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<PointCloudPoint[]>([]);
  const [preset, setPreset] = useState<Preset>('blobs');
  const [numPoints, setNumPoints] = useState<number>(400);
  const [noiseLevel, setNoiseLevel] = useState<number>(0.1);
  const [isHovering, setIsHovering] = useState(false);

  const handleGenerate = useCallback(() => {
    let newPoints: PointCloudPoint[] = [];
    if (preset === 'blobs') newPoints = generateCanvasBlobs(numPoints, noiseLevel, 4);
    else if (preset === 'moons') newPoints = generateMoons(numPoints, noiseLevel);
    else if (preset === 'concentric') newPoints = generateConcentric(numPoints, noiseLevel, 2);
    setPoints(newPoints);
  }, [preset, numPoints, noiseLevel]);

  useEffect(() => { handleGenerate(); }, [handleGenerate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let i = 0; i <= width; i += width / 10) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
    }

    points.forEach((p) => {
      const cx = ((p.x + 1.5) / 3) * width;
      const cy = ((p.y + 1.5) / 3) * height;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
      ctx.fillStyle = SHARED_COLORS[p.cluster % SHARED_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [points]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    const x = (clickX / canvas.width) * 3 - 1.5;
    const y = (clickY / canvas.height) * 3 - 1.5;
    setPoints(prev => [...prev, { x, y, cluster: Math.floor(Math.random() * SHARED_COLORS.length) }]);
  };

  return (
    <div className="min-h-full p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-5xl w-full bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col md:flex-row">
        <div className="w-full md:w-80 bg-slate-900/50 p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col gap-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-2">Point Cloud</h1>
            <p className="text-sm text-slate-400 font-medium">Dataset Generator Lab</p>
          </div>
          <div className="space-y-6 flex-1">
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dataset Preset</label>
              <div className="grid grid-cols-1 gap-2">
                {(['blobs', 'moons', 'concentric'] as Preset[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPreset(p)}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-between ${
                      preset === p 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50' 
                        : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-indigo-500 hover:bg-slate-700'
                    }`}
                  >
                    <span className="capitalize">{p}</span>
                    {preset === p && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Points</label>
                  <span className="text-xs font-bold text-indigo-400">{numPoints}</span>
                </div>
                <input
                  type="range" min="50" max="1000" step="50" value={numPoints}
                  onChange={(e) => setNumPoints(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Noise Level</label>
                  <span className="text-xs font-bold text-indigo-400">{noiseLevel.toFixed(2)}</span>
                </div>
                <input
                  type="range" min="0.01" max="0.3" step="0.01" value={noiseLevel}
                  onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <button
              onClick={handleGenerate}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Regenerate
            </button>
            <button
              onClick={() => setPoints([])}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-rose-950/50 text-rose-400 border border-slate-700 hover:border-rose-900 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              Clear Canvas
            </button>
          </div>
        </div>
        <div className="flex-1 p-6 md:p-8 flex flex-col items-center justify-center bg-slate-900 relative">
          <div className="absolute top-8 right-8 bg-slate-800/80 backdrop-blur-sm border border-slate-700 shadow-sm px-4 py-2 rounded-full flex items-center gap-3 z-10">
            <div className="flex -space-x-1">
              {SHARED_COLORS.slice(0, 4).map((color, i) => (
                <div key={i} className="w-3 h-3 rounded-full border border-slate-800" style={{ backgroundColor: color }} />
              ))}
            </div>
            <span className="text-xs font-bold text-slate-300">{points.length} Points Rendered</span>
          </div>
          <div 
            className="relative w-full max-w-[600px] aspect-square rounded-2xl overflow-hidden shadow-inner border-2 border-slate-800 bg-slate-950 cursor-crosshair transition-all duration-300"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <canvas
              ref={canvasRef} width={800} height={800} onClick={handleCanvasClick}
              className="w-full h-full object-contain"
            />
            <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur text-white text-xs font-medium px-4 py-2 rounded-full pointer-events-none transition-opacity duration-300 ${isHovering && points.length > 0 ? 'opacity-100' : 'opacity-0'}`}>
              Click anywhere to add custom points
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MODULE 2: K Slider
// ==========================================
const SLIDER_COLORS = [
  { bg: 'bg-[#FF6B6B]', shadow: 'shadow-[#FF6B6B]/40', border: 'border-[#FF6B6B]' },
  { bg: 'bg-[#4ECDC4]', shadow: 'shadow-[#4ECDC4]/40', border: 'border-[#4ECDC4]' },
  { bg: 'bg-[#FFE66D]', shadow: 'shadow-[#FFE66D]/40', border: 'border-[#FFE66D]' },
  { bg: 'bg-[#9B5DE5]', shadow: 'shadow-[#9B5DE5]/40', border: 'border-[#9B5DE5]' },
  { bg: 'bg-[#F15BB5]', shadow: 'shadow-[#F15BB5]/40', border: 'border-[#F15BB5]' },
  { bg: 'bg-[#00BBF9]', shadow: 'shadow-[#00BBF9]/40', border: 'border-[#00BBF9]' },
  { bg: 'bg-[#00F5D4]', shadow: 'shadow-[#00F5D4]/40', border: 'border-[#00F5D4]' },
  { bg: 'bg-[#FF9F1C]', shadow: 'shadow-[#FF9F1C]/40', border: 'border-[#FF9F1C]' },
  { bg: 'bg-[#C7F464]', shadow: 'shadow-[#C7F464]/40', border: 'border-[#C7F464]' },
  { bg: 'bg-[#D4A5A5]', shadow: 'shadow-[#D4A5A5]/40', border: 'border-[#D4A5A5]' },
];

function ModuleKSlider() {
  const [kValue, setKValue] = useState<number>(4);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fillPercentage = ((kValue - 1) / 9) * 100;

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 p-8 w-full max-w-md relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm">
              <SlidersHorizontal className="w-5 h-5 text-slate-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">Cluster Count</h2>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-0.5">Hyperparameter (k)</p>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black tracking-tighter text-white">{kValue}</span>
            <span className="text-lg font-bold text-slate-500">/10</span>
          </div>
        </div>

        <div className="bg-slate-950/50 rounded-2xl p-6 mb-8 border border-slate-800/50 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> Active Centroids
            </span>
          </div>
          <div className="flex flex-wrap gap-3 justify-center min-h-[48px] items-center">
            {Array.from({ length: 10 }).map((_, i) => {
              const isActive = i < kValue;
              const color = SLIDER_COLORS[i];
              return (
                <div
                  key={i}
                  className={`transition-all duration-500 ease-out rounded-full ${
                    isActive ? `w-10 h-10 opacity-100 shadow-lg scale-100 ${color.bg} ${color.shadow}` : 'w-4 h-4 opacity-20 scale-75 bg-slate-700 shadow-none'
                  } ${isHovering && isActive ? 'animate-pulse' : ''} ${isDragging && isActive ? 'scale-110' : ''}`}
                />
              );
            })}
          </div>
        </div>

        <div className="relative z-10" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
          <div className="flex justify-between text-xs font-bold text-slate-500 mb-3 px-1">
            <span>1</span><span>10</span>
          </div>
          <div className="relative w-full h-6 flex items-center">
            <div className="absolute w-full h-3 bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-[#4ECDC4] via-[#9B5DE5] to-[#FF6B6B] transition-all duration-150 ease-out" style={{ width: `${fillPercentage}%` }} />
            </div>
            <input
              type="range" min="1" max="10" step="1" value={kValue}
              onChange={(e) => setKValue(parseInt(e.target.value))}
              onMouseDown={() => setIsDragging(true)} onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)} onTouchEnd={() => setIsDragging(false)}
              className="absolute w-full h-full opacity-0 cursor-pointer z-20"
            />
            <div 
              className={`absolute h-7 w-7 bg-slate-900 rounded-full shadow-lg border-2 transition-transform duration-150 ease-out flex items-center justify-center pointer-events-none z-10 ${isDragging ? 'scale-125' : 'scale-100'} ${SLIDER_COLORS[kValue - 1].border}`}
              style={{ left: `calc(${fillPercentage}% - 14px)` }}
            >
              <div className={`w-2 h-2 rounded-full ${SLIDER_COLORS[kValue - 1].bg}`} />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-slate-800 flex items-start gap-3 relative z-10">
          <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-400 leading-relaxed">
            Adjusting <strong className="text-slate-200 font-semibold">k</strong> determines how many distinct clusters the algorithm will attempt to find in the dataset.
          </p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MODULE 3: Init Choices
// ==========================================
type InitPoint = { x: number; y: number };
type InitCentroid = InitPoint & { color: string; id: number };

const generateInitBlobs = (numPoints: number, width: number, height: number): InitPoint[] => {
  const points: InitPoint[] = [];
  const centers = Array.from({ length: 4 }, () => ({
    x: width * 0.2 + Math.random() * (width * 0.6),
    y: height * 0.2 + Math.random() * (height * 0.6),
  }));
  for (let i = 0; i < numPoints; i++) {
    const center = centers[Math.floor(Math.random() * 4)];
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

function ModuleInitChoices() {
  const [points, setPoints] = useState<InitPoint[]>([]);
  const [centroids, setCentroids] = useState<InitCentroid[]>([]);
  const [k, setK] = useState<number>(4);
  const [method, setMethod] = useState<'random' | 'kmeans++' | 'farthest'>('kmeans++');
  const [isAnimating, setIsAnimating] = useState(false);
  const [stepExplanation, setStepExplanation] = useState<string>('Select an initialization method and click Play.');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearAnimation = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsAnimating(false);
  }, []);

  const handleGenerateData = useCallback(() => {
    clearAnimation();
    setPoints(generateInitBlobs(300, 800, 500));
    setCentroids([]);
    setStepExplanation('New dataset generated. Ready to initialize.');
  }, [clearAnimation]);

  useEffect(() => {
    handleGenerateData();
    return () => clearAnimation();
  }, [handleGenerateData, clearAnimation]);

  const getNextCentroid = (currentCentroids: InitCentroid[]): InitPoint => {
    if (currentCentroids.length === 0) return points[Math.floor(Math.random() * points.length)];
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
        if (minDist > maxDist) { maxDist = minDist; bestPoint = p; }
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
        if (cumulative >= r && !currentCentroids.some(c => c.x === points[i].x && c.y === points[i].y)) return points[i];
      }
      return points[Math.floor(Math.random() * points.length)];
    }
    return points[0];
  };

  const runInitialization = () => {
    clearAnimation();
    setCentroids([]);
    setIsAnimating(true);
    let currentCentroids: InitCentroid[] = [];
    
    const step = () => {
      if (currentCentroids.length >= k) {
        setIsAnimating(false);
        setStepExplanation(`Finished initializing ${k} centroids using ${method}.`);
        return;
      }
      const nextPoint = getNextCentroid(currentCentroids);
      const newCentroid: InitCentroid = {
        ...nextPoint,
        color: SHARED_COLORS[currentCentroids.length % SHARED_COLORS.length],
        id: currentCentroids.length,
      };
      currentCentroids = [...currentCentroids, newCentroid];
      setCentroids(currentCentroids);

      if (currentCentroids.length === 1) setStepExplanation('Step 1: Picked the first centroid completely at random.');
      else {
        if (method === 'random') setStepExplanation(`Step ${currentCentroids.length}: Picked another random point.`);
        else if (method === 'farthest') setStepExplanation(`Step ${currentCentroids.length}: Picked the point farthest from all existing centroids.`);
        else if (method === 'kmeans++') setStepExplanation(`Step ${currentCentroids.length}: Picked a point with probability proportional to squared distance (D²).`);
      }
      timeoutRef.current = setTimeout(step, 800);
    };
    step();
  };

  const resetCentroids = () => {
    clearAnimation();
    setCentroids([]);
    setStepExplanation('Centroids cleared. Ready to initialize.');
  };

  return (
    <div className="min-h-full p-6 flex flex-col items-center">
      <header className="w-full max-w-5xl mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Target className="w-8 h-8 text-pink-500" /> Initialization Strategies
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Compare how Random, K-Means++, and Farthest First place initial centroids.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerateData} disabled={isAnimating}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg shadow-sm hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <Shuffle className="w-4 h-4" /> New Data
          </button>
        </div>
      </header>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-800">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Settings</h2>
            <div className="mb-6">
              <label className="flex justify-between text-sm font-medium text-slate-300 mb-2">
                <span>Clusters (k)</span><span className="text-pink-500 font-bold">{k}</span>
              </label>
              <input
                type="range" min="2" max="7" value={k}
                onChange={(e) => setK(parseInt(e.target.value))} disabled={isAnimating}
                className="w-full accent-pink-500"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-3">Initialization Method</label>
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
                      key={m.id} onClick={() => setMethod(m.id as any)} disabled={isAnimating}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        isActive ? 'border-pink-500 bg-pink-950/30 ring-1 ring-pink-500' : 'border-slate-700 hover:border-slate-600 bg-slate-800'
                      } disabled:opacity-50`}
                    >
                      <Icon className={`w-5 h-5 mt-0.5 ${isActive ? 'text-pink-500' : 'text-slate-400'}`} />
                      <div>
                        <div className={`font-semibold text-sm ${isActive ? 'text-pink-400' : 'text-slate-200'}`}>{m.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{m.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={runInitialization} disabled={isAnimating}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-md hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 fill-current" /> {isAnimating ? 'Initializing...' : 'Run Init'}
              </button>
              <button
                onClick={resetCentroids} disabled={isAnimating || centroids.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2 text-slate-400 hover:text-slate-200 font-medium transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" /> Clear Centroids
              </button>
            </div>
          </div>
          <div className="bg-blue-950/30 p-5 rounded-2xl border border-blue-900 text-blue-300">
            <div className="flex items-center gap-2 mb-2 font-bold"><Info className="w-5 h-5" /> Why it matters</div>
            <p className="text-sm leading-relaxed opacity-90">
              Poor initialization can cause K-Means to converge to sub-optimal local minima. <strong>K-Means++</strong> spreads out initial centroids to speed up convergence.
            </p>
          </div>
        </div>
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-800 relative overflow-hidden">
            <svg viewBox="0 0 800 500" className="w-full h-auto bg-slate-950/50 rounded-xl" style={{ maxHeight: '600px' }}>
              {points.map((p, i) => (
                <circle key={`p-${i}`} cx={p.x} cy={p.y} r={4} className="fill-slate-600 transition-all duration-300" />
              ))}
              {isAnimating && centroids.length > 1 && (
                centroids.slice(0, -1).map((c, i) => (
                  <line
                    key={`line-${i}`} x1={c.x} y1={c.y} x2={centroids[centroids.length - 1].x} y2={centroids[centroids.length - 1].y}
                    stroke={centroids[centroids.length - 1].color} strokeWidth="2" strokeDasharray="4 4" className="opacity-40 animate-pulse"
                  />
                ))
              )}
              {centroids.map((c, i) => (
                <g key={`c-${c.id}`} className="transition-all duration-500 ease-out">
                  {i === centroids.length - 1 && isAnimating && (
                    <circle cx={c.x} cy={c.y} r={30} fill={c.color} className="opacity-20 animate-ping" style={{ transformOrigin: `${c.x}px ${c.y}px` }} />
                  )}
                  <circle cx={c.x} cy={c.y} r={14} fill={c.color} className="opacity-30" />
                  <circle cx={c.x} cy={c.y} r={8} fill={c.color} stroke="#1e293b" strokeWidth="2" className="shadow-lg" />
                  <text x={c.x} y={c.y - 20} textAnchor="middle" fill={c.color} className="text-xs font-bold drop-shadow-md">C{i + 1}</text>
                </g>
              ))}
            </svg>
          </div>
          <div className="bg-slate-900 px-6 py-4 rounded-2xl shadow-sm border border-slate-800 flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            <p className="text-slate-300 font-medium">{stepExplanation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MODULE 4: Live Inertia Chart
// ==========================================
type AlgorithmId = 'kmeans' | 'kmedoids' | 'minibatch' | 'gmm';
interface AlgorithmConfig { id: AlgorithmId; name: string; color: string; baseDecay: number; noiseLevel: number; asymptote: number; }
const ALGORITHMS: Record<AlgorithmId, AlgorithmConfig> = {
  kmeans: { id: 'kmeans', name: 'K-Means', color: '#FF499E', baseDecay: 0.65, noiseLevel: 0, asymptote: 1200 },
  kmedoids: { id: 'kmedoids', name: 'K-Medoids', color: '#00E5FF', baseDecay: 0.75, noiseLevel: 20, asymptote: 1500 },
  minibatch: { id: 'minibatch', name: 'MiniBatch', color: '#FFD166', baseDecay: 0.60, noiseLevel: 400, asymptote: 1800 },
  gmm: { id: 'gmm', name: 'GMM (Equivalent)', color: '#A06CD5', baseDecay: 0.85, noiseLevel: 5, asymptote: 900 },
};
interface DataPoint { iteration: number; kmeans: number; kmedoids: number; minibatch: number; gmm: number; }

const generateInitialData = (): DataPoint => ({ iteration: 0, kmeans: 10000, kmedoids: 10000, minibatch: 10000, gmm: 10000 });
const calculateNextValue = (prev: number, config: AlgorithmConfig, batchSizeMultiplier: number = 1): number => {
  const noise = (Math.random() - 0.5) * config.noiseLevel * batchSizeMultiplier;
  let next = (prev - config.asymptote) * config.baseDecay + config.asymptote + noise;
  if (config.id === 'minibatch' && Math.random() > 0.8) next += Math.random() * 800 * batchSizeMultiplier;
  return Math.max(config.asymptote * 0.9, Math.min(10000, next));
};

function ModuleInertiaChart() {
  const [data, setData] = useState<DataPoint[]>([generateInitialData()]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeAlgs, setActiveAlgs] = useState<Set<AlgorithmId>>(new Set(['kmeans', 'kmedoids', 'minibatch', 'gmm']));
  const [batchSize, setBatchSize] = useState<number>(128);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(150);

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => {
      setData((prevData) => {
        const last = prevData[prevData.length - 1];
        if (last.iteration >= 50) { setIsRunning(false); return prevData; }
        const batchMultiplier = batchSize === 32 ? 2 : batchSize === 256 ? 0.5 : 1;
        return [...prevData, {
          iteration: last.iteration + 1,
          kmeans: calculateNextValue(last.kmeans, ALGORITHMS.kmeans),
          kmedoids: calculateNextValue(last.kmedoids, ALGORITHMS.kmedoids),
          minibatch: calculateNextValue(last.minibatch, ALGORITHMS.minibatch, batchMultiplier),
          gmm: calculateNextValue(last.gmm, ALGORITHMS.gmm),
        }];
      });
    }, playbackSpeed);
    return () => clearInterval(timer);
  }, [isRunning, batchSize, playbackSpeed]);

  const toggleAlgorithm = (id: AlgorithmId) => {
    setActiveAlgs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const currentData = data[data.length - 1];
  const progressPercent = (currentData.iteration / 50) * 100;
  const currentLowestInertia = Math.min(...Array.from(activeAlgs).map(alg => currentData[alg] || 10000));
  const mockSilhouette = useMemo(() => {
    if (currentData.iteration === 0) return 0.12;
    const base = 0.85 - (currentLowestInertia / 10000) * 0.7;
    return Math.max(-1, Math.min(1, base + (Math.random() * 0.02 - 0.01)));
  }, [currentLowestInertia, currentData.iteration]);

  const createPath = (algId: AlgorithmId) => {
    if (data.length === 0) return '';
    return data.map((d, i) => {
      const x = (d.iteration / 50) * 800;
      const y = 400 - (d[algId] / 10000) * 400;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
  };

  return (
    <div className="min-h-full flex items-center justify-center p-4">
      <div className="max-w-5xl w-full bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
        <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF499E] to-[#A06CD5]">Live Inertia Chart</span>
            </h1>
            <p className="text-slate-400 mt-2 font-medium">Real-time convergence tracking across clustering algorithms.</p>
          </div>
          <div className="flex items-center gap-4 bg-slate-800 px-5 py-3 rounded-2xl shadow-sm border border-slate-700">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Silhouette Score</span>
              <span className="text-2xl font-black text-white tabular-nums">{mockSilhouette.toFixed(3)}</span>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: mockSilhouette > 0.6 ? '#064e3b' : mockSilhouette > 0.4 ? '#78350f' : '#831843' }}>
              <svg className="w-6 h-6" style={{ color: mockSilhouette > 0.6 ? '#34d399' : mockSilhouette > 0.4 ? '#fbbf24' : '#f43f5e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                {mockSilhouette > 0.5 ? <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />}
              </svg>
            </div>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Simulation</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsRunning(!isRunning)} disabled={currentData.iteration >= 50}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
                    currentData.iteration >= 50 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : isRunning ? 'bg-slate-700 hover:bg-slate-600' : 'bg-[#FF499E] hover:bg-[#e63e8d]'
                  }`}
                >
                  {isRunning ? <><Pause className="w-5 h-5" /> Pause</> : <><Play className="w-5 h-5" /> Run</>}
                </button>
                <button onClick={() => { setIsRunning(false); setData([generateInitialData()]); }} className="py-3 px-4 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all">
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-slate-400 transition-all duration-200 ease-linear" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="text-xs text-slate-500 text-right font-medium tabular-nums">Iteration {currentData.iteration} / 50</div>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Algorithms</h3>
              <div className="flex flex-col gap-2">
                {(Object.values(ALGORITHMS) as AlgorithmConfig[]).map((alg) => {
                  const isActive = activeAlgs.has(alg.id);
                  return (
                    <button
                      key={alg.id} onClick={() => toggleAlgorithm(alg.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${isActive ? 'border-slate-600 bg-slate-800' : 'border-slate-800 bg-transparent opacity-50 hover:opacity-80'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: isActive ? alg.color : '#475569' }} />
                        <span className={`font-bold ${isActive ? 'text-white' : 'text-slate-500'}`}>{alg.name}</span>
                      </div>
                      {isActive && <span className="text-xs font-black tabular-nums" style={{ color: alg.color }}>{Math.round(currentData[alg.id])}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Advanced</h3>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 flex justify-between"><span>Mini-Batch Size</span><span className="text-white">{batchSize}</span></label>
                <input type="range" min="32" max="256" step="32" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} className="w-full accent-[#FFD166]" />
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <label className="text-xs font-bold text-slate-400 flex justify-between"><span>Animation Speed</span><span className="text-white">{playbackSpeed}ms</span></label>
                <input type="range" min="50" max="500" step="50" value={playbackSpeed} onChange={(e) => setPlaybackSpeed(Number(e.target.value))} className="w-full accent-slate-400" style={{ direction: 'rtl' }} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 relative flex flex-col">
            <h2 className="text-lg font-extrabold text-white mb-6 absolute top-6 left-6 z-10">Inertia vs. Iterations</h2>
            <div className="flex-1 relative w-full h-full min-h-[400px] mt-8">
              <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs font-bold text-slate-500 tabular-nums">
                <span>10k</span><span>7.5k</span><span>5k</span><span>2.5k</span><span>0</span>
              </div>
              <div className="absolute left-12 right-0 top-0 bottom-8">
                <svg viewBox="0 0 800 400" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                    <line key={`grid-y-${ratio}`} x1="0" y1={400 * ratio} x2={800} y2={400 * ratio} stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
                  ))}
                  {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => (
                    <line key={`grid-x-${ratio}`} x1={800 * ratio} y1="0" x2={800 * ratio} y2={400} stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
                  ))}
                  {(Object.values(ALGORITHMS) as AlgorithmConfig[]).map((alg) => {
                    if (!activeAlgs.has(alg.id)) return null;
                    const pathData = createPath(alg.id);
                    const currentY = 400 - (currentData[alg.id] / 10000) * 400;
                    const currentX = (currentData.iteration / 50) * 800;
                    return (
                      <g key={`line-${alg.id}`}>
                        <path d={pathData} fill="none" stroke={alg.color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" className="opacity-20 blur-sm transition-all duration-300" />
                        <path d={pathData} fill="none" stroke={alg.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300" />
                        {data.length > 0 && <circle cx={currentX} cy={currentY} r="6" fill="#0f172a" stroke={alg.color} strokeWidth="3" className="transition-all duration-300" />}
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="absolute left-12 right-0 bottom-0 h-8 flex justify-between items-end text-xs font-bold text-slate-500 tabular-nums">
                <span>0</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50</span>
              </div>
            </div>
            {data.length === 1 && !isRunning && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-[1px] rounded-3xl z-20">
                <div className="bg-slate-800 px-6 py-4 rounded-2xl shadow-xl border border-slate-700 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-pink-950/50 rounded-full flex items-center justify-center text-[#FF499E]">
                    <Activity className="w-6 h-6" />
                  </div>
                  <p className="text-white font-bold">Ready to track inertia</p>
                  <button onClick={() => setIsRunning(true)} className="text-sm font-bold text-[#FF499E] hover:text-[#e63e8d] transition-colors">
                    Click Run to start simulation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MODULE 5: Silhouette Score Badge
// ==========================================
const getScoreConfig = (score: number) => {
  if (score >= 0.7) return { color: 'text-emerald-400', bg: 'bg-emerald-950/30', border: 'border-emerald-900/50', icon: CheckCircle2, label: 'Excellent', description: 'Dense and well-separated clusters.' };
  if (score >= 0.5) return { color: 'text-cyan-400', bg: 'bg-cyan-950/30', border: 'border-cyan-900/50', icon: CheckCircle2, label: 'Good', description: 'Reasonable cluster structure found.' };
  if (score >= 0.25) return { color: 'text-amber-400', bg: 'bg-amber-950/30', border: 'border-amber-900/50', icon: AlertTriangle, label: 'Fair', description: 'Weak structure; clusters may be artificial.' };
  if (score >= 0.0) return { color: 'text-orange-400', bg: 'bg-orange-950/30', border: 'border-orange-900/50', icon: AlertTriangle, label: 'Poor', description: 'Overlapping or poorly separated clusters.' };
  return { color: 'text-rose-400', bg: 'bg-rose-950/30', border: 'border-rose-900/50', icon: XCircle, label: 'Invalid', description: 'Incorrect clustering; points assigned to wrong clusters.' };
};

function ModuleSilhouette() {
  const [score, setScore] = useState<number>(0.65);
  const config = getScoreConfig(score);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const percentage = (score + 1) / 2;
  const strokeDashoffset = circumference - percentage * circumference;

  const points = useMemo(() => Array.from({ length: 150 }).map((_, i) => ({ id: i, cluster: i % 3, angle: Math.random() * Math.PI * 2, dist: Math.random() })), []);
  const centers = [{ x: 30, y: 30, color: 'bg-rose-500' }, { x: 70, y: 30, color: 'bg-cyan-500' }, { x: 50, y: 70, color: 'bg-violet-500' }];
  const spreadMultiplier = 15 + ((1 - score) * 25);

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        <div className="md:col-span-7 space-y-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white mb-4">Silhouette Score Badge</h1>
            <p className="text-lg text-slate-400 leading-relaxed">
              Evaluate the quality of your K-Means clustering in real-time. Adjust the slider below to simulate different clustering outcomes.
            </p>
          </div>
          <div className="bg-slate-900 p-6 rounded-3xl border-2 border-slate-800 shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Simulate Score</label>
              <span className="text-2xl font-black text-white">{score.toFixed(2)}</span>
            </div>
            <input
              type="range" min="-1" max="1" step="0.01" value={score}
              onChange={(e) => setScore(parseFloat(e.target.value))}
              className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
            />
            <div className="flex justify-between text-xs font-medium text-slate-500 mt-2">
              <span>-1.0 (Incorrect)</span><span>0.0 (Overlapping)</span><span>1.0 (Perfect)</span>
            </div>
          </div>
          <div className="relative w-full h-64 bg-slate-900 rounded-3xl border-2 border-slate-800 shadow-inner overflow-hidden">
            <div className="absolute top-4 left-4 flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Activity size={14} /> Live Cluster Preview
            </div>
            {points.map((p) => {
              const center = centers[p.cluster];
              const x = center.x + Math.cos(p.angle) * p.dist * spreadMultiplier;
              const y = center.y + Math.sin(p.angle) * p.dist * spreadMultiplier;
              return (
                <div
                  key={p.id}
                  className={`absolute w-2.5 h-2.5 rounded-full opacity-80 mix-blend-screen transition-all duration-700 ease-out ${center.color}`}
                  style={{ left: `${Math.max(5, Math.min(95, x))}%`, top: `${Math.max(5, Math.min(95, y))}%`, transform: 'translate(-50%, -50%)' }}
                />
              );
            })}
            {centers.map((c, i) => (
              <div key={`center-${i}`} className="absolute w-4 h-4 bg-slate-900 border-4 border-white rounded-full shadow-md z-10 transition-all duration-700" style={{ left: `${c.x}%`, top: `${c.y}%`, transform: 'translate(-50%, -50%)' }} />
            ))}
          </div>
        </div>
        <div className="md:col-span-5 flex justify-center">
          <div className="w-full max-w-sm">
            <div className={`relative flex flex-col items-center p-6 rounded-3xl border-2 transition-colors duration-500 ${config.bg} ${config.border} shadow-sm`}>
              <div className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 cursor-help group">
                <Info size={18} />
                <div className="absolute right-0 w-48 p-2 mt-2 text-xs text-white bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                  The Silhouette Score ranges from -1 to 1. It measures how similar an object is to its own cluster compared to other clusters.
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Silhouette Score</h3>
              <div className="relative flex items-center justify-center w-32 h-32 mb-4">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-sm">
                  <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                  <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={`transition-all duration-700 ease-out ${config.color}`} />
                </svg>
                <div className="flex flex-col items-center justify-center z-10">
                  <span className={`text-3xl font-black tracking-tighter transition-colors duration-500 ${config.color}`}>
                    {score > 0 ? '+' : ''}{score.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <config.icon size={20} className={`transition-colors duration-500 ${config.color}`} />
                <span className={`text-lg font-bold transition-colors duration-500 ${config.color}`}>{config.label}</span>
              </div>
              <p className="text-sm text-slate-400 text-center max-w-[200px] h-10 leading-tight">{config.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MODULE 6: Centroid Drift
// ==========================================
type DriftPoint = { id: number; x: number; y: number };
type DriftCentroid = { id: number; x: number; y: number; color: string };

const generateDriftBlobs = (numPoints: number, numBlobs: number) => {
  const points = [];
  const centers = Array.from({ length: numBlobs }, () => ({ x: 150 + Math.random() * 500, y: 150 + Math.random() * 500 }));
  for (let i = 0; i < numPoints; i++) {
    const center = centers[i % numBlobs];
    points.push({
      id: i,
      x: Math.max(20, Math.min(780, center.x + randomGaussian() * 45)),
      y: Math.max(20, Math.min(780, center.y + randomGaussian() * 45)),
    });
  }
  return points;
};

function ModuleCentroidDrift() {
  const [k, setK] = useState(4);
  const [points, setPoints] = useState<DriftPoint[]>([]);
  const [centroids, setCentroids] = useState<DriftCentroid[]>([]);
  const [centroidHistory, setCentroidHistory] = useState<{ x: number; y: number }[][]>([]);
  const [assignments, setAssignments] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<'assign' | 'update'>('assign');
  const [iteration, setIteration] = useState(0);
  const [isConverged, setIsConverged] = useState(false);
  const [speed, setSpeed] = useState(600);

  const initData = useCallback((numClusters: number, regeneratePoints = false) => {
    setIsPlaying(false); setIsConverged(false); setPhase('assign'); setIteration(0);
    let currentPoints = points;
    if (regeneratePoints || points.length === 0) {
      currentPoints = generateDriftBlobs(300, numClusters);
      setPoints(currentPoints);
    }
    const initialCentroids = Array.from({ length: numClusters }, (_, i) => ({
      id: i, x: 50 + Math.random() * 700, y: 50 + Math.random() * 700, color: SHARED_COLORS[i % SHARED_COLORS.length],
    }));
    setCentroids(initialCentroids);
    setCentroidHistory(initialCentroids.map((c) => [{ x: c.x, y: c.y }]));
    setAssignments(new Array(currentPoints.length).fill(-1));
  }, [points]);

  useEffect(() => { initData(k, true); }, []);
  useEffect(() => { initData(k, true); }, [k, initData]);

  const step = useCallback(() => {
    if (isConverged) { setIsPlaying(false); return; }
    if (phase === 'assign') {
      let changed = false;
      const newAssignments = points.map((p, i) => {
        let minDist = Infinity; let minIdx = -1;
        centroids.forEach((c, cIdx) => {
          const d = dist(p, c);
          if (d < minDist) { minDist = d; minIdx = cIdx; }
        });
        if (assignments[i] !== minIdx) changed = true;
        return minIdx;
      });
      setAssignments(newAssignments); setPhase('update');
      if (!changed && iteration > 0) { setIsConverged(true); setIsPlaying(false); }
    } else {
      const newCentroids = centroids.map((c, cIdx) => {
        const assignedPoints = points.filter((_, i) => assignments[i] === cIdx);
        if (assignedPoints.length === 0) return c;
        const sumX = assignedPoints.reduce((sum, p) => sum + p.x, 0);
        const sumY = assignedPoints.reduce((sum, p) => sum + p.y, 0);
        return { ...c, x: sumX / assignedPoints.length, y: sumY / assignedPoints.length };
      });
      setCentroidHistory((prev) => prev.map((hist, i) => [...hist, { x: newCentroids[i].x, y: newCentroids[i].y }]));
      setCentroids(newCentroids); setPhase('assign'); setIteration((prev) => prev + 1);
    }
  }, [points, centroids, assignments, phase, isConverged, iteration]);

  useEffect(() => {
    let timer: number;
    if (isPlaying && !isConverged) timer = window.setTimeout(step, speed);
    return () => clearTimeout(timer);
  }, [isPlaying, isConverged, step, speed]);

  return (
    <div className="min-h-full flex flex-col items-center py-8 px-4">
      <div className="max-w-5xl w-full flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-indigo-500" /> Centroid Drift Animation
          </h1>
          <p className="text-slate-400 mt-1 font-medium">Watch K-Means centroids hunt for the center of mass in real-time.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 px-5 py-3 rounded-2xl shadow-sm border border-slate-800">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Status</span>
            <span className={`text-sm font-bold ${isConverged ? 'text-emerald-400' : isPlaying ? 'text-indigo-400' : 'text-amber-400'}`}>
              {isConverged ? 'Converged' : isPlaying ? 'Computing...' : 'Paused'}
            </span>
          </div>
          <div className="w-px h-8 bg-slate-800 mx-2"></div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Iteration</span>
            <span className="text-sm font-bold text-slate-200">{iteration}</span>
          </div>
          <div className="w-px h-8 bg-slate-800 mx-2"></div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Phase</span>
            <span className="text-sm font-bold text-slate-200 capitalize">{phase}</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-800 flex flex-col gap-6">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Playback</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)} disabled={isConverged}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${
                    isConverged ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : isPlaying ? 'bg-amber-900/50 text-amber-400 hover:bg-amber-900' : 'bg-indigo-600 text-white hover:bg-indigo-500'
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />} {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={step} disabled={isPlaying || isConverged}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <StepForward className="w-4 h-4" /> Step
                </button>
              </div>
            </div>
            <hr className="border-slate-800" />
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Parameters</h3>
              <div className="mb-5">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-300">Clusters (k)</label>
                  <span className="text-sm font-bold text-indigo-400">{k}</span>
                </div>
                <input type="range" min="2" max="8" value={k} onChange={(e) => setK(parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-300">Speed</label>
                  <span className="text-sm font-bold text-indigo-400">{speed}ms</span>
                </div>
                <input type="range" min="100" max="1500" step="100" value={speed} onChange={(e) => setSpeed(parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" style={{ direction: 'rtl' }} />
              </div>
            </div>
            <hr className="border-slate-800" />
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Actions</h3>
              <div className="flex flex-col gap-2">
                <button onClick={() => initData(k, false)} className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all">
                  <RotateCcw className="w-4 h-4" /> Restart Init
                </button>
                <button onClick={() => initData(k, true)} className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all">
                  <RefreshCw className="w-4 h-4" /> New Data
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-3 bg-slate-900 rounded-3xl shadow-sm border border-slate-800 overflow-hidden relative flex items-center justify-center p-4">
          <svg viewBox="0 0 800 800" className="w-full h-auto max-h-[700px] rounded-2xl bg-slate-950/50">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            {centroidHistory.map((history, i) => {
              if (history.length < 2) return null;
              const pointsStr = history.map((p) => `${p.x},${p.y}`).join(' ');
              return (
                <g key={`trail-${i}`}>
                  <polyline points={pointsStr} fill="none" stroke={centroids[i]?.color || '#000'} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" className="transition-all duration-500 ease-in-out" />
                  {history.map((p, j) => <circle key={`hist-${i}-${j}`} cx={p.x} cy={p.y} r="3" fill={centroids[i]?.color || '#000'} opacity={j === history.length - 1 ? 0 : 0.4} />)}
                </g>
              );
            })}
            {points.map((p, i) => {
              const assignedCentroid = assignments[i] !== -1 ? centroids[assignments[i]] : null;
              const color = assignedCentroid ? assignedCentroid.color : '#475569';
              return <circle key={`p-${p.id}`} cx={p.x} cy={p.y} r="5" fill={color} opacity="0.8" className="transition-colors duration-500 ease-in-out" />;
            })}
            {centroids.map((c) => (
              <g key={`c-${c.id}`} style={{ transform: `translate(${c.x}px, ${c.y}px)`, transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                {!isConverged && <circle cx="0" cy="0" r="24" fill={c.color} opacity="0.2" className="animate-pulse" />}
                <circle cx="0" cy="0" r="12" fill="none" stroke="#fff" strokeWidth="3" />
                <circle cx="0" cy="0" r="10" fill={c.color} stroke="#1e293b" strokeWidth="2" />
                <path d="M -6 0 L 6 0 M 0 -6 L 0 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </g>
            ))}
          </svg>
          {isConverged && (
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-6 py-2 rounded-full font-bold shadow-lg animate-bounce">
              Convergence Reached!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN APP COMPONENT
// ==========================================
const TABS = [
  { id: 0, name: 'Point Cloud Canvas', icon: Sparkles },
  { id: 1, name: 'K Slider', icon: SlidersHorizontal },
  { id: 2, name: 'Init Choices', icon: Target },
  { id: 3, name: 'Live Inertia', icon: Activity },
  { id: 4, name: 'Silhouette Score', icon: CheckCircle2 },
  { id: 5, name: 'Centroid Drift', icon: Play },
];

export default function App() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-black tracking-tight text-white">K-Means Lab</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto relative">
        {activeTab === 0 && <ModulePointCloud />}
        {activeTab === 1 && <ModuleKSlider />}
        {activeTab === 2 && <ModuleInitChoices />}
        {activeTab === 3 && <ModuleInertiaChart />}
        {activeTab === 4 && <ModuleSilhouette />}
        {activeTab === 5 && <ModuleCentroidDrift />}
      </div>
    </div>
  );
}