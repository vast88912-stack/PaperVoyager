import React, { useState, useMemo, useRef, MouseEvent } from 'react';

// --- Math & RK4 Integration ---
const DT = 0.01;
const MAX_STEPS = 2500;

function rk4(x: number, y: number, z: number, s: number, r: number, b: number, dt: number) {
  const dx1 = s * (y - x);
  const dy1 = x * (r - z) - y;
  const dz1 = x * y - b * z;

  const x2 = x + 0.5 * dt * dx1;
  const y2 = y + 0.5 * dt * dy1;
  const z2 = z + 0.5 * dt * dz1;
  const dx2 = s * (y2 - x2);
  const dy2 = x2 * (r - z2) - y2;
  const dz2 = x2 * y2 - b * z2;

  const x3 = x + 0.5 * dt * dx2;
  const y3 = y + 0.5 * dt * dy2;
  const z3 = z + 0.5 * dt * dz2;
  const dx3 = s * (y3 - x3);
  const dy3 = x3 * (r - z3) - y3;
  const dz3 = x3 * y3 - b * z3;

  const x4 = x + dt * dx3;
  const y4 = y + dt * dy3;
  const z4 = z + dt * dz3;
  const dx4 = s * (y4 - x4);
  const dy4 = x4 * (r - z4) - y4;
  const dz4 = x4 * y4 - b * z4;

  return [
    x + (dt / 6) * (dx1 + 2 * dx2 + 2 * dx3 + dx4),
    y + (dt / 6) * (dy1 + 2 * dy2 + 2 * dy3 + dy4),
    z + (dt / 6) * (dz1 + 2 * dz2 + 2 * dz3 + dz4)
  ];
}

interface DataPoint {
  t: number;
  x: number;
  y: number;
  z: number;
}

// --- Components ---

interface TimeSeriesChartProps {
  data: DataPoint[];
  variable: 'x' | 'y' | 'z';
  color: string;
  glowColor: string;
  title: string;
  hoverT: number | null;
  onHoverT: (t: number | null) => void;
}

function TimeSeriesChart({ data, variable, color, glowColor, title, hoverT, onHoverT }: TimeSeriesChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const minVal = Math.min(...data.map(d => d[variable]));
  const maxVal = Math.max(...data.map(d => d[variable]));
  const padding = (maxVal - minVal) * 0.1 || 1;
  const yMin = minVal - padding;
  const yMax = maxVal + padding;
  const tMax = data[data.length - 1].t;

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xPos = e.clientX - rect.left;
    const t = (xPos / rect.width) * tMax;
    onHoverT(Math.max(0, Math.min(tMax, t)));
  };

  const handleMouseLeave = () => {
    onHoverT(null);
  };

  // Build SVG Path
  const pathData = useMemo(() => {
    return data.map((d, i) => {
      const px = (d.t / tMax) * 100;
      const py = 100 - ((d[variable] - yMin) / (yMax - yMin)) * 100;
      return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
    }).join(' ');
  }, [data, variable, tMax, yMin, yMax]);

  // Find hover point
  let hoverPoint = null;
  if (hoverT !== null) {
    const closest = data.reduce((prev, curr) => 
      Math.abs(curr.t - hoverT) < Math.abs(prev.t - hoverT) ? curr : prev
    );
    const px = (closest.t / tMax) * 100;
    const py = 100 - ((closest[variable] - yMin) / (yMax - yMin)) * 100;
    hoverPoint = { px, py, val: closest[variable], t: closest.t };
  }

  return (
    <div className="relative w-full h-48 bg-slate-900/50 rounded-xl border border-slate-800 p-4 flex flex-col overflow-hidden group">
      <div className="flex justify-between items-center mb-2 z-10 relative">
        <h3 className="text-sm font-semibold tracking-widest uppercase" style={{ color }}>{title}</h3>
        {hoverPoint && (
          <div className="text-xs font-mono bg-slate-950/80 px-2 py-1 rounded text-slate-300">
            t: {hoverPoint.t.toFixed(2)} | val: <span style={{ color }}>{hoverPoint.val.toFixed(3)}</span>
          </div>
        )}
      </div>

      <div className="flex-1 w-full relative">
        <svg 
          ref={svgRef}
          className="w-full h-full cursor-crosshair overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <filter id={`glow-${variable}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          {/* Grid lines */}
          <line x1="0" y1="50" x2="100" y2="50" stroke="#334155" strokeWidth="0.5" strokeDasharray="2 2" />
          
          {/* Main Trajectory */}
          <path 
            d={pathData} 
            fill="none" 
            stroke={color} 
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
            filter={`url(#glow-${variable})`}
            className="opacity-80 group-hover:opacity-100 transition-opacity duration-300"
          />

          {/* Sync Scrubber Line & Point */}
          {hoverPoint && (
            <>
              <line 
                x1={hoverPoint.px} 
                y1="0" 
                x2={hoverPoint.px} 
                y2="100" 
                stroke="#94a3b8" 
                strokeWidth="0.5" 
                vectorEffect="non-scaling-stroke"
                strokeDasharray="1 1"
              />
              <circle 
                cx={hoverPoint.px} 
                cy={hoverPoint.py} 
                r="2" 
                fill={color} 
                filter={`url(#glow-${variable})`}
              />
              <circle 
                cx={hoverPoint.px} 
                cy={hoverPoint.py} 
                r="4" 
                fill="none"
                stroke="#fff"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

export default function App() {
  // Parameters
  const [sigma, setSigma] = useState(10);
  const [rho, setRho] = useState(28);
  const [beta, setBeta] = useState(2.667);
  
  // Interactive State
  const [hoverT, setHoverT] = useState<number | null>(null);

  // Generate Data
  const trajectoryData = useMemo(() => {
    let cx = 0.1, cy = 0.1, cz = 0.1;
    const pts: DataPoint[] = [];
    for (let i = 0; i < MAX_STEPS; i++) {
      pts.push({ t: i * DT, x: cx, y: cy, z: cz });
      [cx, cy, cz] = rk4(cx, cy, cz, sigma, rho, beta, DT);
    }
    return pts;
  }, [sigma, rho, beta]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-10 font-sans selection:bg-cyan-900 selection:text-cyan-100 flex flex-col items-center">
      
      {/* Header */}
      <div className="w-full max-w-5xl mb-8 flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-emerald-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
            Lorenz Attractor Studio
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-xl leading-relaxed">
            Time series decomposition of the chaotic trajectory. Observe how small parameter shifts ripple through X, Y, and Z dimensions over time. Hover over any chart to scrub through time synchronously.
          </p>
        </div>
        
        {/* Parameter Controls */}
        <div className="flex gap-6 bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-xl backdrop-blur-sm">
          <div className="flex flex-col gap-1 w-24">
            <label className="text-xs text-slate-400 font-mono flex justify-between">
              <span>σ (Sigma)</span>
              <span className="text-cyan-400">{sigma.toFixed(1)}</span>
            </label>
            <input 
              type="range" min="1" max="20" step="0.1" value={sigma} 
              onChange={(e) => setSigma(parseFloat(e.target.value))}
              className="accent-cyan-400"
            />
          </div>
          <div className="flex flex-col gap-1 w-24">
            <label className="text-xs text-slate-400 font-mono flex justify-between">
              <span>ρ (Rho)</span>
              <span className="text-fuchsia-400">{rho.toFixed(1)}</span>
            </label>
            <input 
              type="range" min="1" max="50" step="0.1" value={rho} 
              onChange={(e) => setRho(parseFloat(e.target.value))}
              className="accent-fuchsia-400"
            />
          </div>
          <div className="flex flex-col gap-1 w-24">
            <label className="text-xs text-slate-400 font-mono flex justify-between">
              <span>β (Beta)</span>
              <span className="text-emerald-400">{beta.toFixed(2)}</span>
            </label>
            <input 
              type="range" min="0.5" max="5" step="0.01" value={beta} 
              onChange={(e) => setBeta(parseFloat(e.target.value))}
              className="accent-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* Charts Container */}
      <div className="w-full max-w-5xl flex flex-col gap-6 relative">
        {/* Background glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none" />

        <TimeSeriesChart 
          data={trajectoryData} 
          variable="x" 
          color="#22d3ee" 
          glowColor="rgba(34,211,238,0.5)"
          title="X-Axis Evolution (Convection Flow)" 
          hoverT={hoverT}
          onHoverT={setHoverT}
        />
        
        <TimeSeriesChart 
          data={trajectoryData} 
          variable="y" 
          color="#e879f9" 
          glowColor="rgba(232,121,249,0.5)"
          title="Y-Axis Evolution (Horizontal Temp Distribution)" 
          hoverT={hoverT}
          onHoverT={setHoverT}
        />
        
        <TimeSeriesChart 
          data={trajectoryData} 
          variable="z" 
          color="#34d399" 
          glowColor="rgba(52,211,153,0.5)"
          title="Z-Axis Evolution (Vertical Temp Profile)" 
          hoverT={hoverT}
          onHoverT={setHoverT}
        />
      </div>

    </div>
  );
}