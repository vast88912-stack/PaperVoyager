import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Utility Functions ---

// Box-Muller transform for normally distributed random numbers
const randomNormal = (mean = 0, std = 1) => {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * std + mean;
};

// Candy color palette for the clusters
const CANDY_COLORS = [
  '#FF6B6B', // Watermelon
  '#4ECDC4', // Mint
  '#FFE66D', // Lemon
  '#C7CEEA', // Lavender
  '#FF9AA2', // Cotton Candy
];

// --- Data Generators ---

const generateBlobs = (n: number, noise: number) => {
  const points = [];
  const centers = [
    { x: 0.3, y: 0.3 },
    { x: 0.7, y: 0.3 },
    { x: 0.5, y: 0.7 },
    { x: 0.2, y: 0.8 },
  ];
  
  for (let i = 0; i < n; i++) {
    const cluster = i % centers.length;
    const center = centers[cluster];
    points.push({
      x: randomNormal(center.x, noise * 0.15),
      y: randomNormal(center.y, noise * 0.15),
      cluster,
    });
  }
  return points;
};

const generateMoons = (n: number, noise: number) => {
  const points = [];
  for (let i = 0; i < n; i++) {
    const cluster = i % 2;
    const t = Math.random() * Math.PI;
    
    if (cluster === 0) {
      // Top moon
      points.push({
        x: 0.25 + 0.25 * Math.cos(t) + randomNormal(0, noise * 0.05),
        y: 0.4 + 0.25 * Math.sin(t) + randomNormal(0, noise * 0.05),
        cluster,
      });
    } else {
      // Bottom moon
      points.push({
        x: 0.5 - 0.25 * Math.cos(t) + randomNormal(0, noise * 0.05),
        y: 0.55 - 0.25 * Math.sin(t) + randomNormal(0, noise * 0.05),
        cluster,
      });
    }
  }
  return points;
};

const generateConcentric = (n: number, noise: number) => {
  const points = [];
  for (let i = 0; i < n; i++) {
    const cluster = i % 2;
    const t = Math.random() * 2 * Math.PI;
    const r = cluster === 0 ? 0.15 : 0.35;
    
    points.push({
      x: 0.5 + r * Math.cos(t) + randomNormal(0, noise * 0.05),
      y: 0.5 + r * Math.sin(t) + randomNormal(0, noise * 0.05),
      cluster,
    });
  }
  return points;
};

type Preset = 'blobs' | 'moons' | 'concentric';

interface Point {
  x: number;
  y: number;
  cluster: number;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [preset, setPreset] = useState<Preset>('blobs');
  const [numPoints, setNumPoints] = useState<number>(800);
  const [noise, setNoise] = useState<number>(0.5);
  const [points, setPoints] = useState<Point[]>([]);

  // Generate dataset
  const generateData = useCallback(() => {
    let newPoints: Point[] = [];
    switch (preset) {
      case 'blobs':
        newPoints = generateBlobs(numPoints, noise);
        break;
      case 'moons':
        newPoints = generateMoons(numPoints, noise);
        break;
      case 'concentric':
        newPoints = generateConcentric(numPoints, noise);
        break;
    }
    setPoints(newPoints);
  }, [preset, numPoints, noise]);

  // Initial generation and on parameter change
  useEffect(() => {
    generateData();
  }, [generateData]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const width = rect.width;
    const height = rect.height;

    // Clear and draw background
    ctx.clearRect(0, 0, width, height);
    
    // Draw subtle grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Draw points with animation-like pop effect
    points.forEach((p) => {
      const px = p.x * width;
      const py = p.y * height;
      const color = CANDY_COLORS[p.cluster % CANDY_COLORS.length];

      ctx.beginPath();
      ctx.arc(px, py, 4, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      
      // Add a slight transparency for density visualization
      ctx.globalAlpha = 0.8;
      ctx.fill();
      
      // Stroke for better definition
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 1.0;
      ctx.stroke();
    });

  }, [points]);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      setPoints([...points]); // Trigger a redraw
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [points]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-purple-400 shadow-md flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500">
            K-Means & Friends Lab
          </h1>
        </div>
        <div className="text-sm font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
          Dataset Generator
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar Controls */}
        <aside className="w-80 bg-white border-r border-slate-200 p-6 flex flex-col gap-8 overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
          
          {/* Preset Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dataset Shape</label>
            <div className="grid grid-cols-1 gap-2">
              {(['blobs', 'moons', 'concentric'] as Preset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={`relative flex items-center px-4 py-3 rounded-xl border transition-all duration-200 ${
                    preset === p 
                      ? 'border-purple-400 bg-purple-50 text-purple-700 shadow-sm' 
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="capitalize font-medium">{p}</span>
                  {preset === p && (
                    <span className="absolute right-4 w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Points</label>
                <span className="text-sm font-semibold text-slate-700">{numPoints}</span>
              </div>
              <input 
                type="range" 
                min="100" 
                max="2000" 
                step="100"
                value={numPoints}
                onChange={(e) => setNumPoints(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Noise Level</label>
                <span className="text-sm font-semibold text-slate-700">{noise.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1.5" 
                step="0.05"
                value={noise}
                onChange={(e) => setNoise(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-slate-100">
            <button
              onClick={generateData}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors shadow-md flex justify-center items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate Data
            </button>
          </div>

        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 p-8 bg-slate-100/50 flex flex-col relative">
          
          <div className="mb-4 flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 capitalize">{preset} Dataset</h2>
              <p className="text-slate-500 text-sm mt-1">Ground truth distribution visualization.</p>
            </div>
            
            {/* Legend / Status */}
            <div className="flex gap-4">
              <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clusters</span>
                <div className="flex gap-1.5">
                  {CANDY_COLORS.slice(0, preset === 'blobs' ? 4 : 2).map((c, i) => (
                    <div key={i} className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: c }}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Canvas Container */}
          <div 
            ref={containerRef} 
            className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative"
          >
            <canvas 
              ref={canvasRef}
              className="absolute inset-0 block touch-none"
            />
          </div>
          
        </main>
      </div>
    </div>
  );
}