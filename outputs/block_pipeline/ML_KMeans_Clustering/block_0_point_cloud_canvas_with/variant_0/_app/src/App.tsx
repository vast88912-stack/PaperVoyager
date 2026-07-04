import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types & Constants ---
type Point = {
  x: number;
  y: number;
  cluster: number;
};

type Preset = 'blobs' | 'moons' | 'concentric';

const CANDY_COLORS = [
  '#FF9CEE', // Pink
  '#B28DFF', // Purple
  '#6EB5FF', // Blue
  '#A1EBAE', // Green
  '#FDFD96', // Yellow
  '#FFC9DE', // Light Pink
  '#85E3FF', // Cyan
];

// --- Math Helpers ---
// Box-Muller transform for normal distribution
const randomGaussian = (mean = 0, stdev = 1) => {
  let u = 1 - Math.random();
  let v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
};

// --- Generators ---
const generateBlobs = (n: number, noise: number, centers = 3): Point[] => {
  const points: Point[] = [];
  const clusterCenters = Array.from({ length: centers }, () => ({
    x: (Math.random() * 1.6 - 0.8), // -0.8 to 0.8
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

const generateMoons = (n: number, noise: number): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i < n; i++) {
    const cluster = i % 2;
    const theta = Math.random() * Math.PI;
    
    if (cluster === 0) {
      // Top moon
      points.push({
        x: (Math.cos(theta) - 0.5) * 0.8 + randomGaussian(0, noise),
        y: (Math.sin(theta) - 0.25) * 0.8 + randomGaussian(0, noise),
        cluster,
      });
    } else {
      // Bottom moon
      points.push({
        x: (1 - Math.cos(theta) - 0.5) * 0.8 + randomGaussian(0, noise),
        y: (0.5 - Math.sin(theta) - 0.25) * 0.8 + randomGaussian(0, noise),
        cluster,
      });
    }
  }
  return points;
};

const generateConcentric = (n: number, noise: number, rings = 2): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i < n; i++) {
    const cluster = i % rings;
    const radius = 0.3 + (cluster * 0.5); // 0.3, 0.8
    const theta = Math.random() * 2 * Math.PI;
    
    points.push({
      x: radius * Math.cos(theta) + randomGaussian(0, noise),
      y: radius * Math.sin(theta) + randomGaussian(0, noise),
      cluster,
    });
  }
  return points;
};

// --- Main Component ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [preset, setPreset] = useState<Preset>('blobs');
  const [numPoints, setNumPoints] = useState<number>(400);
  const [noiseLevel, setNoiseLevel] = useState<number>(0.1);
  const [isHovering, setIsHovering] = useState(false);

  // Generate points based on current settings
  const handleGenerate = useCallback(() => {
    let newPoints: Point[] = [];
    if (preset === 'blobs') {
      newPoints = generateBlobs(numPoints, noiseLevel, 4);
    } else if (preset === 'moons') {
      newPoints = generateMoons(numPoints, noiseLevel);
    } else if (preset === 'concentric') {
      newPoints = generateConcentric(numPoints, noiseLevel, 2);
    }
    setPoints(newPoints);
  }, [preset, numPoints, noiseLevel]);

  // Initial generation
  useEffect(() => {
    handleGenerate();
  }, [handleGenerate]);

  // Render points to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= width; i += width / 10) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
    }

    // Draw points
    points.forEach((p) => {
      // Map from [-1.5, 1.5] to [0, width]
      const cx = ((p.x + 1.5) / 3) * width;
      const cy = ((p.y + 1.5) / 3) * height;

      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
      ctx.fillStyle = CANDY_COLORS[p.cluster % CANDY_COLORS.length];
      ctx.fill();
      
      // Add a subtle border to points for better visibility
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [points]);

  // Handle canvas click to add custom points
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    
    // Map back to [-1.5, 1.5]
    const x = (clickX / canvas.width) * 3 - 1.5;
    const y = (clickY / canvas.height) * 3 - 1.5;
    
    setPoints(prev => [...prev, { x, y, cluster: Math.floor(Math.random() * CANDY_COLORS.length) }]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col md:flex-row">
        
        {/* Sidebar Controls */}
        <div className="w-full md:w-80 bg-slate-50/50 p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col gap-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-2">
              K-Means & Friends
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Point Cloud Generator Lab
            </p>
          </div>

          <div className="space-y-6 flex-1">
            {/* Preset Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Dataset Preset
              </label>
              <div className="grid grid-cols-1 gap-2">
                {(['blobs', 'moons', 'concentric'] as Preset[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPreset(p)}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-between ${
                      preset === p 
                        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200' 
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    <span className="capitalize">{p}</span>
                    {preset === p && (
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Data Points
                  </label>
                  <span className="text-xs font-bold text-indigo-500">{numPoints}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={numPoints}
                  onChange={(e) => setNumPoints(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Noise Level
                  </label>
                  <span className="text-xs font-bold text-indigo-500">{noiseLevel.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.3"
                  step="0.01"
                  value={noiseLevel}
                  onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-3">
            <button
              onClick={handleGenerate}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Regenerate
            </button>
            <button
              onClick={() => setPoints([])}
              className="w-full py-3 px-4 bg-white hover:bg-red-50 text-red-500 border border-red-100 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              Clear Canvas
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 p-6 md:p-8 flex flex-col items-center justify-center bg-white relative">
          
          {/* Badge */}
          <div className="absolute top-8 right-8 bg-white/80 backdrop-blur-sm border border-slate-100 shadow-sm px-4 py-2 rounded-full flex items-center gap-3 z-10">
            <div className="flex -space-x-1">
              {CANDY_COLORS.slice(0, 4).map((color, i) => (
                <div key={i} className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: color }} />
              ))}
            </div>
            <span className="text-xs font-bold text-slate-500">
              {points.length} Points Rendered
            </span>
          </div>

          <div 
            className="relative w-full max-w-[600px] aspect-square rounded-2xl overflow-hidden shadow-inner border-2 border-slate-100 bg-slate-50 cursor-crosshair transition-all duration-300"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <canvas
              ref={canvasRef}
              width={800}
              height={800}
              onClick={handleCanvasClick}
              className="w-full h-full object-contain"
            />
            
            {/* Overlay hint */}
            <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur text-white text-xs font-medium px-4 py-2 rounded-full pointer-events-none transition-opacity duration-300 ${isHovering && points.length > 0 ? 'opacity-100' : 'opacity-0'}`}>
              Click anywhere to add custom points
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}