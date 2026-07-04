import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- Math & Generation Helpers ---

const randomGaussian = (): number => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

export type Point = {
  id: string;
  x: number;
  y: number;
  clusterId: number;
};

export type PresetType = 'blobs' | 'moons' | 'concentric';

const CANDY_COLORS = [
  '#FF499E', // Pink
  '#45CB85', // Mint
  '#4D8BFF', // Blue
  '#FFCA3A', // Yellow
  '#9D4EDD', // Purple
];

const generateBlobs = (n: number, noise: number): Point[] => {
  const centers = [
    { x: 0.3, y: 0.3 },
    { x: 0.7, y: 0.7 },
    { x: 0.7, y: 0.3 },
    { x: 0.3, y: 0.7 },
    { x: 0.5, y: 0.5 },
  ];
  const numClusters = 3; // Use 3 for blobs by default
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const clusterId = i % numClusters;
    const center = centers[clusterId];
    pts.push({
      id: `pt-${i}`,
      x: center.x + randomGaussian() * noise * 0.5,
      y: center.y + randomGaussian() * noise * 0.5,
      clusterId,
    });
  }
  return pts;
};

const generateMoons = (n: number, noise: number): Point[] => {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const clusterId = i % 2;
    const t = Math.random() * Math.PI;
    let x, y;
    if (clusterId === 0) {
      x = Math.cos(t);
      y = Math.sin(t);
    } else {
      x = 1 - Math.cos(t);
      y = 0.5 - Math.sin(t);
    }
    // Scale and center
    x = 0.25 + ((x + 1) / 3) * 0.5;
    y = 0.25 + ((y + 0.5) / 1.5) * 0.5;
    
    pts.push({
      id: `pt-${i}`,
      x: x + randomGaussian() * noise * 0.2,
      y: y + randomGaussian() * noise * 0.2,
      clusterId,
    });
  }
  return pts;
};

const generateConcentric = (n: number, noise: number): Point[] => {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const clusterId = i % 2;
    const r = clusterId === 0 ? 0.15 : 0.35;
    const t = Math.random() * Math.PI * 2;
    pts.push({
      id: `pt-${i}`,
      x: 0.5 + r * Math.cos(t) + randomGaussian() * noise * 0.2,
      y: 0.5 + r * Math.sin(t) + randomGaussian() * noise * 0.2,
      clusterId,
    });
  }
  return pts;
};

// --- Main Application Component ---

export default function App() {
  const [preset, setPreset] = useState<PresetType>('blobs');
  const [numPoints, setNumPoints] = useState<number>(400);
  const [noiseLevel, setNoiseLevel] = useState<number>(0.1);
  const [points, setPoints] = useState<Point[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  const generateData = useCallback(() => {
    let newPoints: Point[] = [];
    switch (preset) {
      case 'blobs':
        newPoints = generateBlobs(numPoints, noiseLevel);
        break;
      case 'moons':
        newPoints = generateMoons(numPoints, noiseLevel);
        break;
      case 'concentric':
        newPoints = generateConcentric(numPoints, noiseLevel);
        break;
    }
    // Clamp points to [0, 1] to avoid rendering outside SVG
    newPoints = newPoints.map(p => ({
      ...p,
      x: Math.max(0.02, Math.min(0.98, p.x)),
      y: Math.max(0.02, Math.min(0.98, p.y)),
    }));
    setPoints(newPoints);
  }, [preset, numPoints, noiseLevel]);

  // Initial generation
  useEffect(() => {
    generateData();
  }, [generateData]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row">
      
      {/* Sidebar Controls */}
      <aside className="w-full md:w-80 bg-white border-r border-slate-200 p-6 flex flex-col gap-8 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-1">
            K-Means <span className="text-pink-500">&</span> Friends
          </h1>
          <p className="text-sm text-slate-500 font-medium">Dataset Generation Lab</p>
        </div>

        <div className="space-y-6 flex-1">
          {/* Preset Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Distribution Preset
            </label>
            <div className="grid grid-cols-1 gap-2">
              {(['blobs', 'moons', 'concentric'] as PresetType[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-between ${
                    preset === p
                      ? 'bg-slate-900 text-white shadow-md scale-[1.02]'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className="capitalize">{p}</span>
                  {preset === p && (
                    <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Number of Points Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Data Points
              </label>
              <span className="text-sm font-mono font-semibold text-slate-700">{numPoints}</span>
            </div>
            <input
              type="range"
              min="50"
              max="1000"
              step="50"
              value={numPoints}
              onChange={(e) => setNumPoints(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
          </div>

          {/* Noise Level Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Noise Level
              </label>
              <span className="text-sm font-mono font-semibold text-slate-700">{noiseLevel.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.3"
              step="0.01"
              value={noiseLevel}
              onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={generateData}
          className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-pink-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Regenerate Data
        </button>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 p-4 md:p-8 flex flex-col">
        
        {/* Top Badges / Info (Placeholder for full app context) */}
        <div className="flex flex-wrap gap-4 mb-6 items-center justify-end">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ground Truth Visible</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Points Rendered:</span>
            <span className="text-sm font-mono font-bold text-slate-700">{points.length}</span>
          </div>
        </div>

        {/* Canvas Container */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative group">
          
          {/* Grid Background */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}
          />

          {/* SVG Canvas */}
          <svg 
            className="w-full h-full absolute inset-0"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Points Rendering */}
            {points.map((pt) => {
              const isHovered = hoveredPoint === pt.id;
              const color = CANDY_COLORS[pt.clusterId % CANDY_COLORS.length];
              
              return (
                <g key={pt.id} className="transition-transform duration-300 ease-out">
                  <circle
                    cx={pt.x * 1000}
                    cy={pt.y * 1000}
                    r={isHovered ? 12 : 6}
                    fill={color}
                    opacity={isHovered ? 1 : 0.85}
                    filter={isHovered ? 'url(#glow)' : undefined}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredPoint(pt.id)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  {/* Subtle inner dot for depth */}
                  <circle
                    cx={pt.x * 1000}
                    cy={pt.y * 1000}
                    r={isHovered ? 4 : 2}
                    fill="#ffffff"
                    opacity={0.5}
                    className="pointer-events-none transition-all duration-200"
                  />
                </g>
              );
            })}
          </svg>

          {/* Overlay Instructions */}
          <div className="absolute bottom-6 left-6 pointer-events-none">
            <div className="bg-white/80 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-white/50">
              <h3 className="text-sm font-bold text-slate-800 mb-1">Point Cloud Canvas</h3>
              <p className="text-xs text-slate-500">
                Hover over points to interact. Use the sidebar to generate new distributions.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}