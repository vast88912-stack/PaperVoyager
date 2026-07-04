import React, { useState, useEffect, useRef, useCallback } from 'react';

// Random normal distribution (Box-Muller transform)
const randn_bm = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

// Candy color palette for clusters
const CANDY_COLORS = [
  '#FF9AA2', '#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA', '#F1CBFF', '#C8E7FF', '#FCE2C6'
];

type Point = {
  x: number;
  y: number;
  cluster: number;
};

type DatasetType = 'blobs' | 'moons' | 'concentric';

export default function App() {
  const [datasetType, setDatasetType] = useState<DatasetType>('blobs');
  const [numPoints, setNumPoints] = useState(600);
  const [noise, setNoise] = useState(0.05);
  const [numBlobs, setNumBlobs] = useState(4);
  const [points, setPoints] = useState<Point[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generates datasets normalized between 0.1 and 0.9 for visual padding
  const generateDataset = useCallback(() => {
    let newPoints: Point[] = [];

    if (datasetType === 'blobs') {
      // Generate random centers
      const centers = Array.from({ length: numBlobs }).map(() => ({
        x: 0.2 + Math.random() * 0.6,
        y: 0.2 + Math.random() * 0.6,
      }));

      for (let i = 0; i < numPoints; i++) {
        const cluster = i % numBlobs;
        const center = centers[cluster];
        newPoints.push({
          x: center.x + randn_bm() * noise,
          y: center.y + randn_bm() * noise,
          cluster,
        });
      }
    } 
    else if (datasetType === 'moons') {
      const halfPoints = Math.floor(numPoints / 2);
      for (let i = 0; i < numPoints; i++) {
        const isFirstMoon = i < halfPoints;
        const t = Math.PI * Math.random(); // angle [0, pi]
        
        let x, y;
        if (isFirstMoon) {
          x = Math.cos(t) + randn_bm() * noise;
          y = Math.sin(t) + randn_bm() * noise;
        } else {
          x = 1 - Math.cos(t) + randn_bm() * noise;
          y = 1 - Math.sin(t) - 0.5 + randn_bm() * noise;
        }
        newPoints.push({ x, y, cluster: isFirstMoon ? 0 : 1 });
      }

      // Normalize Moons to fit canvas
      const xs = newPoints.map((p) => p.x);
      const ys = newPoints.map((p) => p.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);

      newPoints = newPoints.map((p) => ({
        x: 0.1 + ((p.x - minX) / (maxX - minX)) * 0.8,
        y: 0.1 + ((p.y - minY) / (maxY - minY)) * 0.8,
        cluster: p.cluster,
      }));
    } 
    else if (datasetType === 'concentric') {
      const halfPoints = Math.floor(numPoints / 2);
      for (let i = 0; i < numPoints; i++) {
        const isInner = i < halfPoints;
        const rBase = isInner ? 0.2 : 0.7;
        const r = rBase + randn_bm() * noise;
        const t = 2 * Math.PI * Math.random();
        
        const x = 0.5 + r * Math.cos(t) * 0.4;
        const y = 0.5 + r * Math.sin(t) * 0.4;
        newPoints.push({ x, y, cluster: isInner ? 0 : 1 });
      }
    }

    setPoints(newPoints);
  }, [datasetType, numPoints, noise, numBlobs]);

  // Initial generation
  useEffect(() => {
    generateDataset();
  }, [generateDataset]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Draw subtle grid
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
    for (let i = 0; i < h; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }

    // Draw points
    points.forEach((p) => {
      const cx = p.x * w;
      const cy = p.y * h;
      
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
      ctx.fillStyle = CANDY_COLORS[p.cluster % CANDY_COLORS.length];
      ctx.fill();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

  }, [points]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-slate-800">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
        
        {/* Controls Sidebar */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-8">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-pink-400 to-indigo-400 bg-clip-text text-transparent">
              K-Means & Friends
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Data Visualization Lab</p>
          </div>

          <div className="space-y-6 flex-1">
            {/* Dataset Type Selector */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Preset Dataset
              </label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl">
                {(['blobs', 'moons', 'concentric'] as DatasetType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setDatasetType(type)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                      datasetType === type
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Sliders */}
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700">Points</label>
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{numPoints}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="50"
                  value={numPoints}
                  onChange={(e) => setNumPoints(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700">Noise Level</label>
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{noise.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.2"
                  step="0.01"
                  value={noise}
                  onChange={(e) => setNoise(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-400"
                />
              </div>

              {datasetType === 'blobs' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-slate-700">Clusters (Blobs)</label>
                    <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{numBlobs}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="8"
                    step="1"
                    value={numBlobs}
                    onChange={(e) => setNumBlobs(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-mint-400"
                  />
                </div>
              )}
            </div>
          </div>

          <button
            onClick={generateDataset}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21v-5h5" />
            </svg>
            Regenerate Dataset
          </button>
        </div>

        {/* Main Canvas Area */}
        <div className="relative bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px]">
          {/* Canvas Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-sm z-10 absolute top-0 w-full">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-pink-400 shadow-[0_0_10px_rgba(244,114,182,0.6)]"></div>
              <h2 className="font-bold text-slate-700">Interactive Point Cloud</h2>
            </div>
            <div className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
              N = {points.length}
            </div>
          </div>

          {/* Canvas Container */}
          <div ref={containerRef} className="flex-1 w-full h-full bg-transparent mt-14">
            <canvas
              ref={canvasRef}
              className="block cursor-crosshair"
            />
          </div>
          
          {/* Tooltip hint floating */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-medium tracking-wide shadow-lg border border-slate-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
            </svg>
            Ready for clustering algorithms
          </div>
        </div>

      </div>
    </div>
  );
}