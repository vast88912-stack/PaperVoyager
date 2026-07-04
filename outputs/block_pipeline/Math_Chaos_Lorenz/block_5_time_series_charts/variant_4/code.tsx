import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Activity, MousePointer2 } from 'lucide-react';

// Runtime dependencies: lucide-react

// --- Math & RK4 Integration ---
const LORENZ_EQUATIONS = (x: number, y: number, z: number, sigma: number, rho: number, beta: number) => {
  return [
    sigma * (y - x),
    x * (rho - z) - y,
    x * y - beta * z
  ];
};

const generateLorenzTimeSeries = (
  sigma: number,
  rho: number,
  beta: number,
  dt: number,
  steps: number
) => {
  const points = new Float32Array(steps * 4); // [t, x, y, z] flat array for performance
  let x = 0.1, y = 0.1, z = 0.1;
  let t = 0;

  for (let i = 0; i < steps; i++) {
    const idx = i * 4;
    points[idx] = t;
    points[idx + 1] = x;
    points[idx + 2] = y;
    points[idx + 3] = z;

    const [dx1, dy1, dz1] = LORENZ_EQUATIONS(x, y, z, sigma, rho, beta);
    const [dx2, dy2, dz2] = LORENZ_EQUATIONS(x + dx1 * dt / 2, y + dy1 * dt / 2, z + dz1 * dt / 2, sigma, rho, beta);
    const [dx3, dy3, dz3] = LORENZ_EQUATIONS(x + dx2 * dt / 2, y + dy2 * dt / 2, z + dz2 * dt / 2, sigma, rho, beta);
    const [dx4, dy4, dz4] = LORENZ_EQUATIONS(x + dx3 * dt, y + dy3 * dt, z + dz3 * dt, sigma, rho, beta);

    x += (dt / 6) * (dx1 + 2 * dx2 + 2 * dx3 + dx4);
    y += (dt / 6) * (dy1 + 2 * dy2 + 2 * dy3 + dy4);
    z += (dt / 6) * (dz1 + 2 * dz2 + 2 * dz3 + dz4);
    t += dt;
  }
  return points;
};

// --- Subcomponents ---

interface TimeSeriesChartProps {
  data: Float32Array;
  offset: number;
  windowSize: number;
  valueIndex: number; // 1 for X, 2 for Y, 3 for Z
  color: string;
  label: string;
  domain: [number, number];
  hoverIndex: number | null;
  onHover: (index: number | null) => void;
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  offset,
  windowSize,
  valueIndex,
  color,
  label,
  domain,
  hoverIndex,
  onHover
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const pathD = useMemo(() => {
    const width = 1000;
    const height = 150;
    const [min, max] = domain;
    const range = max - min;
    
    let d = '';
    for (let i = 0; i < windowSize; i++) {
      const dataIdx = (offset + i) * 4;
      if (dataIdx >= data.length) break;
      
      const val = data[dataIdx + valueIndex];
      const x = (i / (windowSize - 1)) * width;
      const y = height - ((val - min) / range) * height;
      
      d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    return d;
  }, [data, offset, windowSize, valueIndex, domain]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const index = Math.max(0, Math.min(windowSize - 1, Math.floor((x / rect.width) * windowSize)));
    onHover(index);
  };

  const handleMouseLeave = () => {
    onHover(null);
  };

  // Calculate hover coordinates
  let hoverX = 0;
  let hoverY = 0;
  let hoverVal = 0;
  let hoverT = 0;
  if (hoverIndex !== null) {
    const actualIdx = (offset + hoverIndex) * 4;
    if (actualIdx < data.length) {
      hoverT = data[actualIdx];
      hoverVal = data[actualIdx + valueIndex];
      const width = 1000;
      const height = 150;
      const [min, max] = domain;
      hoverX = (hoverIndex / (windowSize - 1)) * width;
      hoverY = height - ((hoverVal - min) / (max - min)) * height;
    }
  }

  return (
    <div className="relative w-full h-32 md:h-40 bg-[#0b0c14] border border-[#1e2336] rounded-xl overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] group">
      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-20"
           style={{ backgroundImage: 'linear-gradient(#1e2336 1px, transparent 1px), linear-gradient(90deg, #1e2336 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      
      {/* Label */}
      <div className="absolute top-3 left-4 flex items-center gap-2 z-10 pointer-events-none">
        <div className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{ color, backgroundColor: color }} />
        <span className="text-sm font-bold tracking-widest text-white drop-shadow-md">{label}(t)</span>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 1000 150"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
        
        {/* Hover Crosshair & Point */}
        {hoverIndex !== null && (
          <g>
            <line
              x1={hoverX}
              y1={0}
              x2={hoverX}
              y2={150}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <circle
              cx={hoverX}
              cy={hoverY}
              r="5"
              fill="#0b0c14"
              stroke={color}
              strokeWidth="2"
              style={{ filter: `drop-shadow(0 0 8px ${color})` }}
            />
          </g>
        )}
      </svg>

      {/* Hover Tooltip */}
      {hoverIndex !== null && (
        <div 
          className="absolute top-3 right-4 bg-[#0b0c14]/80 backdrop-blur-md border border-[#2a2f45] px-3 py-1.5 rounded-lg pointer-events-none shadow-lg flex items-center gap-4 text-xs font-mono z-10"
        >
          <span className="text-gray-400">t: <span className="text-gray-200">{hoverT.toFixed(2)}</span></span>
          <span style={{ color }}>val: <span className="font-bold drop-shadow-[0_0_4px_currentColor]">{hoverVal.toFixed(3)}</span></span>
        </div>
      )}
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [sigma, setSigma] = useState(10);
  const [rho, setRho] = useState(28);
  const [beta, setBeta] = useState(2.667);
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const TOTAL_STEPS = 15000;
  const DT = 0.005;
  const WINDOW_SIZE = 2500;
  const PLAY_SPEED = 10;

  // Generate data based on parameters
  const data = useMemo(() => {
    return generateLorenzTimeSeries(sigma, rho, beta, DT, TOTAL_STEPS);
  }, [sigma, rho, beta]);

  // Animation Loop
  const requestRef = useRef<number>();
  const animate = useCallback(() => {
    if (isPlaying) {
      setOffset(prev => {
        if (prev + WINDOW_SIZE + PLAY_SPEED >= TOTAL_STEPS) {
          return 0; // loop back to start seamlessly
        }
        return prev + PLAY_SPEED;
      });
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, TOTAL_STEPS, WINDOW_SIZE]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  // Domains for plotting (fixed to prevent jittering, though could be dynamic)
  const domainX: [number, number] = [-30, 30];
  const domainY: [number, number] = [-40, 40];
  const domainZ: [number, number] = [0, 60];

  return (
    <div className="min-h-screen bg-[#050508] text-gray-200 font-sans selection:bg-cyan-900 flex flex-col">
      
      {/* Header */}
      <header className="px-6 py-4 border-b border-white/5 bg-[#0a0a10] flex items-center justify-between sticky top-0 z-50 shadow-xl shadow-black/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
            <Activity className="text-cyan-400 w-5 h-5 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-500">
              Lorenz Attractor Studio
            </h1>
            <p className="text-xs text-gray-500 font-mono tracking-widest uppercase">Time Series Analysis</p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-[#0b0c14] border border-[#1e2336] rounded-lg p-1">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-2 rounded-md transition-all ${isPlaying ? 'bg-cyan-500/10 text-cyan-400' : 'hover:bg-white/5 text-gray-400'}`}
              title={isPlaying ? "Pause Time" : "Play Time"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setOffset(0)}
              className="p-2 rounded-md hover:bg-white/5 text-gray-400 transition-all"
              title="Reset Time"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Column: Parameter Controls */}
        <aside className="w-full lg:w-80 border-r border-white/5 bg-[#0a0a10]/50 backdrop-blur-sm flex flex-col p-6 space-y-8 overflow-y-auto">
          
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              System Parameters
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Adjust the non-linear differential equation constants to observe chaotic bifurcations in the time series.
            </p>
          </div>

          {/* Sliders */}
          <div className="space-y-6">
            {/* Sigma Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-mono text-cyan-400">σ (Sigma)</label>
                <span className="text-xs font-mono bg-[#1e2336] px-2 py-1 rounded text-cyan-200">{sigma.toFixed(2)}</span>
              </div>
              <input
                type="range" min="0" max="30" step="0.1" value={sigma}
                onChange={(e) => setSigma(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#1e2336] rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-gray-600 font-mono">
                <span>0</span><span>Prandtl Number</span><span>30</span>
              </div>
            </div>

            {/* Rho Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-mono text-fuchsia-400">ρ (Rho)</label>
                <span className="text-xs font-mono bg-[#1e2336] px-2 py-1 rounded text-fuchsia-200">{rho.toFixed(2)}</span>
              </div>
              <input
                type="range" min="0" max="50" step="0.1" value={rho}
                onChange={(e) => setRho(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#1e2336] rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
              />
              <div className="flex justify-between text-[10px] text-gray-600 font-mono">
                <span>0</span><span>Rayleigh Number</span><span>50</span>
              </div>
            </div>

            {/* Beta Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-mono text-amber-400">β (Beta)</label>
                <span className="text-xs font-mono bg-[#1e2336] px-2 py-1 rounded text-amber-200">{beta.toFixed(3)}</span>
              </div>
              <input
                type="range" min="0" max="10" step="0.001" value={beta}
                onChange={(e) => setBeta(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#1e2336] rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-gray-600 font-mono">
                <span>0</span><span>Geometric Factor</span><span>10</span>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-white/5">
            <div className="bg-white/5 rounded-xl p-4 flex items-start gap-3">
              <MousePointer2 className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
              <p className="text-xs text-gray-400 leading-relaxed">
                Hover over any chart to scrub through the time domain and sync the crosshair across all state variables.
              </p>
            </div>
          </div>
        </aside>

        {/* Right Column: Time Series Charts */}
        <section className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 relative">
          
          {/* Timeline Mini-map / Scrub bar */}
          <div className="w-full h-12 bg-[#0b0c14] border border-[#1e2336] rounded-xl flex flex-col justify-center px-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-fuchsia-500/5 to-amber-500/5" />
            <div className="flex justify-between items-center relative z-10 text-xs font-mono text-gray-500">
              <span>Time: {(offset * DT).toFixed(2)}s</span>
              <span className="text-white/30 uppercase tracking-widest text-[10px]">Evolution Window</span>
              <span>Total: {(TOTAL_STEPS * DT).toFixed(2)}s</span>
            </div>
            {/* Playhead indicator */}
            <div 
              className="absolute bottom-0 h-1 bg-white/20 left-0 transition-all duration-75"
              style={{ width: `${((offset + WINDOW_SIZE) / TOTAL_STEPS) * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white]" />
            </div>
          </div>

          {/* Charts Container */}
          <div className="flex-1 flex flex-col gap-6 justify-center">
            <TimeSeriesChart
              data={data}
              offset={offset}
              windowSize={WINDOW_SIZE}
              valueIndex={1} // X
              color="#22d3ee" // Cyan
              label="X"
              domain={domainX}
              hoverIndex={hoverIndex}
              onHover={setHoverIndex}
            />
            
            <TimeSeriesChart
              data={data}
              offset={offset}
              windowSize={WINDOW_SIZE}
              valueIndex={2} // Y
              color="#e879f9" // Fuchsia
              label="Y"
              domain={domainY}
              hoverIndex={hoverIndex}
              onHover={setHoverIndex}
            />
            
            <TimeSeriesChart
              data={data}
              offset={offset}
              windowSize={WINDOW_SIZE}
              valueIndex={3} // Z
              color="#fbbf24" // Amber
              label="Z"
              domain={domainZ}
              hoverIndex={hoverIndex}
              onHover={setHoverIndex}
            />
          </div>
          
        </section>
      </main>
    </div>
  );
}