import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// --- RK4 Integration ---
type State = { x: number; y: number; z: number };
type Params = { sigma: number; rho: number; beta: number };

const lorenz = (state: State, params: Params): State => {
  return {
    x: params.sigma * (state.y - state.x),
    y: state.x * (params.rho - state.z) - state.y,
    z: state.x * state.y - params.beta * state.z,
  };
};

const stepRK4 = (state: State, params: Params, dt: number): State => {
  const k1 = lorenz(state, params);
  
  const s2 = {
    x: state.x + 0.5 * dt * k1.x,
    y: state.y + 0.5 * dt * k1.y,
    z: state.z + 0.5 * dt * k1.z,
  };
  const k2 = lorenz(s2, params);
  
  const s3 = {
    x: state.x + 0.5 * dt * k2.x,
    y: state.y + 0.5 * dt * k2.y,
    z: state.z + 0.5 * dt * k2.z,
  };
  const k3 = lorenz(s3, params);
  
  const s4 = {
    x: state.x + dt * k3.x,
    y: state.y + dt * k3.y,
    z: state.z + dt * k3.z,
  };
  const k4 = lorenz(s4, params);

  return {
    x: state.x + (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
    y: state.y + (dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
    z: state.z + (dt / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z),
  };
};

// --- Main Component ---
export default function App() {
  const [params, setParams] = useState<Params>({ sigma: 10, rho: 28, beta: 2.667 });
  const [showPerturbation, setShowPerturbation] = useState(true);
  const [steps, setSteps] = useState(2500);
  const dt = 0.01;

  const canvasRefs = {
    x: useRef<HTMLCanvasElement>(null),
    y: useRef<HTMLCanvasElement>(null),
    z: useRef<HTMLCanvasElement>(null),
  };

  const containerRef = useRef<HTMLDivElement>(null);

  // Generate Data
  const data = useMemo(() => {
    const baseTrajectory: State[] = [];
    const pertTrajectory: State[] = [];
    
    let baseState = { x: 1, y: 1, z: 1 };
    let pertState = { x: 1.00001, y: 1, z: 1 }; // Tiny perturbation in X

    for (let i = 0; i < steps; i++) {
      baseTrajectory.push(baseState);
      if (showPerturbation) {
        pertTrajectory.push(pertState);
        pertState = stepRK4(pertState, params, dt);
      }
      baseState = stepRK4(baseState, params, dt);
    }
    
    return { baseTrajectory, pertTrajectory };
  }, [params, steps, showPerturbation]);

  // Draw Charts
  const drawCharts = useCallback(() => {
    const axes = ['x', 'y', 'z'] as const;
    const colors = {
      x: '#06b6d4', // Cyan
      y: '#a855f7', // Purple
      z: '#eab308', // Yellow
    };
    const pertColor = '#f43f5e'; // Rose for perturbed divergence

    axes.forEach((axis) => {
      const canvas = canvasRefs[axis].current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle high-DPI displays
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      // Find Min/Max for scaling
      let minVal = Infinity;
      let maxVal = -Infinity;
      
      for (let i = 0; i < steps; i++) {
        const val1 = data.baseTrajectory[i][axis];
        if (val1 < minVal) minVal = val1;
        if (val1 > maxVal) maxVal = val1;
        
        if (showPerturbation) {
          const val2 = data.pertTrajectory[i][axis];
          if (val2 < minVal) minVal = val2;
          if (val2 > maxVal) maxVal = val2;
        }
      }

      // Add padding to bounds
      const padding = (maxVal - minVal) * 0.1;
      minVal -= padding;
      maxVal += padding;

      const mapY = (val: number) => height - ((val - minVal) / (maxVal - minVal)) * height;
      const mapX = (idx: number) => (idx / (steps - 1)) * width;

      // Draw Grid Lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Draw Zero Line if within range
      if (minVal < 0 && maxVal > 0) {
        ctx.strokeStyle = '#334155';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, mapY(0));
        ctx.lineTo(width, mapY(0));
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Base Trajectory
      ctx.beginPath();
      ctx.strokeStyle = colors[axis];
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = colors[axis];
      
      for (let i = 0; i < steps; i++) {
        const px = mapX(i);
        const py = mapY(data.baseTrajectory[i][axis]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Draw Perturbed Trajectory
      if (showPerturbation) {
        ctx.beginPath();
        ctx.strokeStyle = pertColor;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = pertColor;
        // ctx.globalCompositeOperation = 'screen';
        
        for (let i = 0; i < steps; i++) {
          const px = mapX(i);
          const py = mapY(data.pertTrajectory[i][axis]);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }

    });
  }, [data, showPerturbation, steps]);

  useEffect(() => {
    drawCharts();
    window.addEventListener('resize', drawCharts);
    return () => window.removeEventListener('resize', drawCharts);
  }, [drawCharts]);

  // Export current params to URL
  const exportToURL = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('sigma', params.sigma.toString());
    url.searchParams.set('rho', params.rho.toString());
    url.searchParams.set('beta', params.beta.toString());
    window.history.pushState({}, '', url.toString());
    alert('Parameters saved to URL query!');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-cyan-900 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md flex justify-between items-center z-10">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-rose-400 bg-clip-text text-transparent drop-shadow-sm">
            Lorenz Attractor Studio
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Time Series & Chaos Sensitivity Analysis
          </p>
        </div>
        <button
          onClick={exportToURL}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-sm font-medium transition-colors border border-slate-700 hover:border-cyan-800 shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]"
        >
          Share Params
        </button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row p-6 gap-6 overflow-hidden">
        
        {/* Controls Sidebar */}
        <aside className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-xl shadow-black/50 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <h2 className="text-lg font-semibold mb-4 text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
              System Parameters
            </h2>
            
            <div className="space-y-5">
              {/* Sigma Control */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-400">Prandtl (σ)</label>
                  <span className="text-sm font-mono text-cyan-400">{params.sigma.toFixed(2)}</span>
                </div>
                <input
                  type="range" min="1" max="30" step="0.1"
                  value={params.sigma}
                  onChange={(e) => setParams({ ...params, sigma: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Rho Control */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-400">Rayleigh (ρ)</label>
                  <span className="text-sm font-mono text-purple-400">{params.rho.toFixed(2)}</span>
                </div>
                <input
                  type="range" min="1" max="50" step="0.1"
                  value={params.rho}
                  onChange={(e) => setParams({ ...params, rho: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
              </div>

              {/* Beta Control */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-400">Geometry (β)</label>
                  <span className="text-sm font-mono text-yellow-400">{params.beta.toFixed(3)}</span>
                </div>
                <input
                  type="range" min="0.5" max="5" step="0.01"
                  value={params.beta}
                  onChange={(e) => setParams({ ...params, beta: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-xl shadow-black/50">
            <h2 className="text-lg font-semibold mb-4 text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
              Simulation Settings
            </h2>
            
            <div className="space-y-6">
              {/* Step Control */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-400">Integration Steps</label>
                  <span className="text-sm font-mono text-slate-300">{steps}</span>
                </div>
                <input
                  type="range" min="500" max="5000" step="100"
                  value={steps}
                  onChange={(e) => setSteps(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
                />
              </div>

              {/* Perturbation Toggle */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={showPerturbation}
                    onChange={() => setShowPerturbation(!showPerturbation)} 
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${showPerturbation ? 'bg-rose-500/30 border border-rose-500/50' : 'bg-slate-800 border border-slate-700'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showPerturbation ? 'transform translate-x-4 shadow-[0_0_10px_rgba(244,63,94,0.8)]' : ''}`}></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Butterfly Effect</span>
                  <span className="text-xs text-slate-500">Overlay tiny perturbation (Δx=10⁻⁵)</span>
                </div>
              </label>
            </div>
          </div>
        </aside>

        {/* Charts Area */}
        <div ref={containerRef} className="flex-1 flex flex-col gap-4 min-w-0">
          
          {/* X Chart */}
          <div className="flex-1 bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex flex-col shadow-lg shadow-black/30 relative overflow-hidden group">
            <div className="absolute top-4 left-4 flex items-center gap-2 z-10 bg-[#0f172a]/80 px-2 py-1 rounded-md backdrop-blur-sm border border-slate-800">
              <span className="text-cyan-400 font-mono font-bold text-sm">X(t)</span>
              <span className="text-xs text-slate-500">Convection</span>
            </div>
            <canvas ref={canvasRefs.x} className="w-full flex-1" />
          </div>

          {/* Y Chart */}
          <div className="flex-1 bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex flex-col shadow-lg shadow-black/30 relative overflow-hidden group">
            <div className="absolute top-4 left-4 flex items-center gap-2 z-10 bg-[#0f172a]/80 px-2 py-1 rounded-md backdrop-blur-sm border border-slate-800">
              <span className="text-purple-400 font-mono font-bold text-sm">Y(t)</span>
              <span className="text-xs text-slate-500">Horizontal Temp Diff</span>
            </div>
            <canvas ref={canvasRefs.y} className="w-full flex-1" />
          </div>

          {/* Z Chart */}
          <div className="flex-1 bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex flex-col shadow-lg shadow-black/30 relative overflow-hidden group">
            <div className="absolute top-4 left-4 flex items-center gap-2 z-10 bg-[#0f172a]/80 px-2 py-1 rounded-md backdrop-blur-sm border border-slate-800">
              <span className="text-yellow-400 font-mono font-bold text-sm">Z(t)</span>
              <span className="text-xs text-slate-500">Vertical Temp Diff</span>
            </div>
            <canvas ref={canvasRefs.z} className="w-full flex-1" />
          </div>

        </div>
      </main>
    </div>
  );
}