import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- MATH & INTEGRATION LOGIC ---
const DT = 0.008;
const MAX_STEPS = 12000;

const lorenz = (x: number, y: number, z: number, sigma: number, rho: number, beta: number) => [
  sigma * (y - x),
  x * (rho - z) - y,
  x * y - beta * z,
];

const rk4Step = (pos: number[], sigma: number, rho: number, beta: number) => {
  const [x, y, z] = pos;
  const k1 = lorenz(x, y, z, sigma, rho, beta);
  const k2 = lorenz(x + (k1[0] * DT) / 2, y + (k1[1] * DT) / 2, z + (k1[2] * DT) / 2, sigma, rho, beta);
  const k3 = lorenz(x + (k2[0] * DT) / 2, y + (k2[1] * DT) / 2, z + (k2[2] * DT) / 2, sigma, rho, beta);
  const k4 = lorenz(x + k3[0] * DT, y + k3[1] * DT, z + k3[2] * DT, sigma, rho, beta);

  return [
    x + (DT / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    y + (DT / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    z + (DT / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
  ];
};

// --- COMPONENTS ---

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Parse initial state from URL or use defaults
  const getInitialParam = (key: string, defaultVal: number) => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const val = params.get(key);
      if (val) return parseFloat(val);
    }
    return defaultVal;
  };

  const [sigma, setSigma] = useState<number>(() => getInitialParam('sigma', 10));
  const [rho, setRho] = useState<number>(() => getInitialParam('rho', 28));
  const [beta, setBeta] = useState<number>(() => getInitialParam('beta', 2.667));
  const [showPerturbations, setShowPerturbations] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);

  // Render Attractor
  const drawAttractor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to window
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Clear background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#020208';
    ctx.fillRect(0, 0, width, height);

    const scale = Math.min(width, height) / 75;
    const cx = width / 2;
    const cy = height / 2 + 150;

    // Projection helper
    const project = (x: number, z: number) => [cx + x * scale * 1.5, cy - z * scale];

    // Trajectory setup
    const trajectories = [
      { pos: [0.1, 0.1, 0.1], color: '#06b6d4', shadow: '#0891b2' }, // Cyan
    ];

    if (showPerturbations) {
      trajectories.push({ pos: [0.1001, 0.1, 0.1], color: '#d946ef', shadow: '#c026d3' }); // Magenta
      trajectories.push({ pos: [0.0999, 0.1, 0.1], color: '#eab308', shadow: '#ca8a04' }); // Yellow
    }

    // Pre-calculate full paths to render smoothly
    const paths = trajectories.map(() => [] as [number, number][]);

    for (let t = 0; t < trajectories.length; t++) {
      let currentPos = [...trajectories[t].pos];
      for (let i = 0; i < MAX_STEPS; i++) {
        currentPos = rk4Step(currentPos, sigma, rho, beta);
        paths[t].push(project(currentPos[0], currentPos[2]) as [number, number]);
      }
    }

    // Draw all paths
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1.2;

    paths.forEach((path, i) => {
      ctx.beginPath();
      ctx.strokeStyle = trajectories[i].color;
      ctx.shadowColor = trajectories[i].shadow;
      ctx.shadowBlur = 10;
      
      // Move to start
      ctx.moveTo(path[0][0], path[0][1]);
      for (let j = 1; j < path.length; j++) {
        ctx.lineTo(path[j][0], path[j][1]);
      }
      ctx.stroke();
    });
  }, [sigma, rho, beta, showPerturbations]);

  useEffect(() => {
    drawAttractor();
    window.addEventListener('resize', drawAttractor);
    return () => window.removeEventListener('resize', drawAttractor);
  }, [drawAttractor]);

  // Share URL Generator
  const handleShare = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('sigma', sigma.toFixed(2));
    url.searchParams.set('rho', rho.toFixed(2));
    url.searchParams.set('beta', beta.toFixed(3));
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetParams = () => {
    setSigma(10);
    setRho(28);
    setBeta(2.667);
  };

  return (
    <div className="relative min-h-screen bg-[#020208] text-slate-200 overflow-hidden font-sans flex items-center justify-start md:justify-end md:p-12 p-4 selection:bg-cyan-500/30">
      {/* 3D Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-0 pointer-events-none"
      />

      {/* Control Panel Widget - Sliders Module */}
      <div className="relative z-10 w-full max-w-sm bg-[#0a0a16]/80 backdrop-blur-2xl border border-white/5 p-6 rounded-3xl shadow-[0_0_80px_rgba(6,182,212,0.1)] flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-400 tracking-wide">
              Attractor Controls
            </h2>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">
              Parameter Sensitivity
            </p>
          </div>
          <button
            onClick={resetParams}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-cyan-400"
            title="Reset to defaults"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Sliders Container */}
        <div className="flex flex-col gap-5">
          {/* Sigma Slider */}
          <ParameterSlider
            label="Sigma"
            symbol="σ"
            description="Prandtl number (viscous/thermal ratio)"
            value={sigma}
            min={1}
            max={30}
            step={0.1}
            color="from-cyan-500 to-blue-500"
            trackColor="cyan"
            onChange={setSigma}
          />

          {/* Rho Slider */}
          <ParameterSlider
            label="Rho"
            symbol="ρ"
            description="Rayleigh number (buoyancy force)"
            value={rho}
            min={1}
            max={100}
            step={0.1}
            color="from-fuchsia-500 to-pink-500"
            trackColor="fuchsia"
            onChange={setRho}
          />

          {/* Beta Slider */}
          <ParameterSlider
            label="Beta"
            symbol="β"
            description="Geometric ratio of the domain"
            value={beta}
            min={0.1}
            max={10}
            step={0.001}
            color="from-yellow-400 to-amber-500"
            trackColor="yellow"
            onChange={setBeta}
          />
        </div>

        {/* Toggles & Actions */}
        <div className="pt-4 mt-2 border-t border-white/5 flex flex-col gap-4">
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm font-medium text-slate-300 group-hover:text-cyan-400 transition-colors">
              Show Perturbations
            </span>
            <div className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${showPerturbations ? 'bg-cyan-500' : 'bg-slate-700'}`}>
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={showPerturbations}
                onChange={(e) => setShowPerturbations(e.target.checked)}
              />
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${showPerturbations ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
          </label>

          <button
            onClick={handleShare}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-slate-800 to-slate-800 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-700/50 text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_0_0_rgba(6,182,212,0)] hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] text-white"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied to Clipboard
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Share Parameters
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

interface ParameterSliderProps {
  label: string;
  symbol: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  color: string;
  trackColor: 'cyan' | 'fuchsia' | 'yellow';
  onChange: (val: number) => void;
}

function ParameterSlider({ label, symbol, description, value, min, max, step, color, trackColor, onChange }: ParameterSliderProps) {
  const percent = ((value - min) / (max - min)) * 100;
  
  // Dynamic color map for the glowing track
  const trackColors = {
    cyan: '#06b6d4',
    fuchsia: '#d946ef',
    yellow: '#eab308'
  };

  const activeColor = trackColors[trackColor];

  return (
    <div className="flex flex-col gap-2 group">
      {/* Label and Value Display */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-black bg-clip-text text-transparent bg-gradient-to-br ${color}`}>
              {symbol}
            </span>
            <span className="text-sm font-semibold text-slate-200">{label}</span>
          </div>
          <span className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors">
            {description}
          </span>
        </div>
        
        {/* Value Box */}
        <div className="relative">
          <div className={`absolute inset-0 bg-gradient-to-r ${color} blur-[10px] opacity-20 group-hover:opacity-40 transition-opacity`} />
          <input
            type="number"
            value={Number.isInteger(value) ? value : value.toFixed(3)}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) onChange(Math.min(max, Math.max(min, val)));
            }}
            className="relative w-16 bg-slate-900/50 border border-slate-700 text-right text-xs font-mono py-1 px-2 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Custom Slider Input */}
      <div className="relative w-full h-4 flex items-center mt-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        />
        
        {/* Track Background */}
        <div className="absolute w-full h-1.5 bg-slate-800 rounded-full overflow-hidden z-0">
          {/* Fill Bar */}
          <div 
            className="h-full transition-all duration-75 ease-out shadow-[0_0_10px_currentColor]"
            style={{ 
              width: `${percent}%`, 
              backgroundColor: activeColor,
              boxShadow: `0 0 10px ${activeColor}, 0 0 20px ${activeColor}40`
            }} 
          />
        </div>

        {/* Thumb */}
        <div 
          className="absolute h-4 w-4 rounded-full bg-white z-10 pointer-events-none transition-all duration-75 ease-out flex items-center justify-center shadow-[0_0_10px_rgba(255,255,255,0.5)] border-2"
          style={{ 
            left: `calc(${percent}% - 8px)`,
            borderColor: activeColor 
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeColor }} />
        </div>
      </div>
    </div>
  );
}