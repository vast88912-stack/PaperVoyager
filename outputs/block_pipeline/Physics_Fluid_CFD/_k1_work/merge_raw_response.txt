import React, { useEffect, useRef, useState, useCallback } from 'react';

const N = 64;
const ITER = 4;
const SIZE = (N + 2) * (N + 2);

const IX = (x: number, y: number) => x + y * (N + 2);

class Fluid {
  dt: number;
  diff: number;
  visc: number;
  
  s: Float32Array;
  density: Float32Array;
  
  Vx: Float32Array;
  Vy: Float32Array;
  Vx0: Float32Array;
  Vy0: Float32Array;
  
  p: Float32Array;
  div: Float32Array;
  obstacle: Uint8Array;

  constructor(dt: number, diffusion: number, viscosity: number) {
    this.dt = dt;
    this.diff = diffusion;
    this.visc = viscosity;

    this.s = new Float32Array(SIZE);
    this.density = new Float32Array(SIZE);
    
    this.Vx = new Float32Array(SIZE);
    this.Vy = new Float32Array(SIZE);
    this.Vx0 = new Float32Array(SIZE);
    this.Vy0 = new Float32Array(SIZE);
    
    this.p = new Float32Array(SIZE);
    this.div = new Float32Array(SIZE);
    this.obstacle = new Uint8Array(SIZE);
  }

  reset() {
    this.s.fill(0);
    this.density.fill(0);
    this.Vx.fill(0);
    this.Vy.fill(0);
    this.Vx0.fill(0);
    this.Vy0.fill(0);
    this.p.fill(0);
    this.div.fill(0);
    this.obstacle.fill(0);
  }

  addDensity(x: number, y: number, amount: number) {
    const index = IX(x, y);
    if (index >= 0 && index < SIZE && !this.obstacle[index]) {
      this.density[index] += amount;
    }
  }

  addVelocity(x: number, y: number, amountX: number, amountY: number) {
    const index = IX(x, y);
    if (index >= 0 && index < SIZE && !this.obstacle[index]) {
      this.Vx[index] += amountX;
      this.Vy[index] += amountY;
    }
  }

  step() {
    const { visc, diff, dt, Vx, Vy, Vx0, Vy0, s, density } = this;

    this.diffuse(1, Vx0, Vx, visc, dt);
    this.diffuse(2, Vy0, Vy, visc, dt);

    this.project(Vx0, Vy0, Vx, Vy);

    this.advect(1, Vx, Vx0, Vx0, Vy0, dt);
    this.advect(2, Vy, Vy0, Vx0, Vy0, dt);

    this.project(Vx, Vy, Vx0, Vy0);

    this.diffuse(0, s, density, diff, dt);
    this.advect(0, density, s, Vx, Vy, dt);
  }

  set_bnd(b: number, x: Float32Array) {
    for (let i = 1; i <= N; i++) {
      x[IX(0, i)] = b === 1 ? -x[IX(1, i)] : x[IX(1, i)];
      x[IX(N + 1, i)] = b === 1 ? -x[IX(N, i)] : x[IX(N, i)];
      x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
      x[IX(i, N + 1)] = b === 2 ? -x[IX(i, N)] : x[IX(i, N)];
    }
    x[IX(0, 0)] = 0.5 * (x[IX(1, 0)] + x[IX(0, 1)]);
    x[IX(0, N + 1)] = 0.5 * (x[IX(1, N + 1)] + x[IX(0, N)]);
    x[IX(N + 1, 0)] = 0.5 * (x[IX(N, 0)] + x[IX(N + 1, 1)]);
    x[IX(N + 1, N + 1)] = 0.5 * (x[IX(N, N + 1)] + x[IX(N + 1, N)]);

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        if (this.obstacle[IX(i, j)]) {
          x[IX(i, j)] = 0;
        }
      }
    }
  }

  lin_solve(b: number, x: Float32Array, x0: Float32Array, a: number, c: number) {
    const cRecip = 1.0 / c;
    for (let k = 0; k < ITER; k++) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          if (!this.obstacle[IX(i, j)]) {
            x[IX(i, j)] =
              (x0[IX(i, j)] +
                a *
                  (x[IX(i - 1, j)] +
                   x[IX(i + 1, j)] +
                   x[IX(i, j - 1)] +
                   x[IX(i, j + 1)])) *
              cRecip;
          }
        }
      }
      this.set_bnd(b, x);
    }
  }

  diffuse(b: number, x: Float32Array, x0: Float32Array, diff: number, dt: number) {
    const a = dt * diff * N * N;
    this.lin_solve(b, x, x0, a, 1 + 4 * a);
  }

  advect(b: number, d: Float32Array, d0: Float32Array, u: Float32Array, v: Float32Array, dt: number) {
    let i0, j0, i1, j1;
    let x, y, s0, t0, s1, t1;
    const dt0 = dt * N;

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        if (this.obstacle[IX(i, j)]) continue;

        x = i - dt0 * u[IX(i, j)];
        y = j - dt0 * v[IX(i, j)];
        
        if (x < 0.5) x = 0.5;
        if (x > N + 0.5) x = N + 0.5;
        i0 = Math.floor(x);
        i1 = i0 + 1;
        
        if (y < 0.5) y = 0.5;
        if (y > N + 0.5) y = N + 0.5;
        j0 = Math.floor(y);
        j1 = j0 + 1;
        
        s1 = x - i0;
        s0 = 1.0 - s1;
        t1 = y - j0;
        t0 = 1.0 - t1;
        
        d[IX(i, j)] =
          s0 * (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) +
          s1 * (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)]);
      }
    }
    this.set_bnd(b, d);
  }

  project(u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array) {
    const h = 1.0 / N;
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        if (!this.obstacle[IX(i, j)]) {
          div[IX(i, j)] =
            -0.5 * h * (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)]);
          p[IX(i, j)] = 0;
        }
      }
    }
    this.set_bnd(0, div);
    this.set_bnd(0, p);

    this.lin_solve(0, p, div, 1, 4);

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        if (!this.obstacle[IX(i, j)]) {
          u[IX(i, j)] -= 0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)]) / h;
          v[IX(i, j)] -= 0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)]) / h;
        }
      }
    }
    this.set_bnd(1, u);
    this.set_bnd(2, v);
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'controls' | 'presets' | 'visuals' | 'perf'>('controls');
  
  const [viscosity, setViscosity] = useState<number>(0.0000001);
  const [diffusion, setDiffusion] = useState<number>(0.0);
  const [dt, setDt] = useState<number>(0.1);
  
  const [showPressure, setShowPressure] = useState<boolean>(false);
  const [showVelocity, setShowVelocity] = useState<boolean>(false);
  const [preset, setPreset] = useState<string>('none');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const perfCanvasRef = useRef<HTMLCanvasElement>(null);
  const fluidRef = useRef<Fluid>(new Fluid(dt, diffusion, viscosity));
  
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const perfData = useRef({
    frames: 0,
    lastTime: performance.now(),
    history: new Array(60).fill(0),
    logicHistory: new Array(60).fill(0),
    renderHistory: new Array(60).fill(0),
    historyIdx: 0,
    fps: 0,
    avgFrameTime: 0,
    avgLogicTime: 0,
    avgRenderTime: 0
  });

  const [, forceRender] = useState({});

  const handleReset = useCallback(() => {
    fluidRef.current.reset();
    setPreset('none');
  }, []);

  useEffect(() => {
    fluidRef.current.visc = viscosity;
    fluidRef.current.diff = diffusion;
    fluidRef.current.dt = dt;
  }, [viscosity, diffusion, dt]);

  useEffect(() => {
    const fluid = fluidRef.current;
    fluid.reset();
    if (preset === 'vortex_street') {
      const cx = Math.floor(N / 3);
      const cy = Math.floor(N / 2);
      for (let i = cx - 3; i <= cx + 3; i++) {
        for (let j = cy - 3; j <= cy + 3; j++) {
          fluid.obstacle[IX(i, j)] = 1;
        }
      }
    }
  }, [preset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const offscreen = document.createElement('canvas');
    offscreen.width = N + 2;
    offscreen.height = N + 2;
    const offCtx = offscreen.getContext('2d')!;
    const imgData = offCtx.createImageData(N + 2, N + 2);

    let animationId: number;

    const renderLoop = (time: number) => {
      const fluid = fluidRef.current;
      const perf = perfData.current;

      const frameStartTime = performance.now();
      perf.lastTime = frameStartTime;

      const logicStartTime = performance.now();

      if (preset === 'smoke_jet') {
        fluid.addDensity(Math.floor(N / 2), N - 2, 200);
        fluid.addVelocity(Math.floor(N / 2), N - 2, (Math.random() - 0.5) * 2, -15);
      } else if (preset === 'vortex_street') {
        for (let j = Math.floor(N / 2) - 5; j <= Math.floor(N / 2) + 5; j++) {
          fluid.addDensity(2, j, 150);
          fluid.addVelocity(2, j, 10, (Math.random() - 0.5) * 2);
        }
      }

      fluid.step();
      const logicEndTime = performance.now();
      const logicMs = logicEndTime - logicStartTime;

      const renderStartTime = performance.now();
      
      for (let i = 0; i < SIZE; i++) {
        if (fluid.obstacle[i]) {
          imgData.data[i * 4] = 100;
          imgData.data[i * 4 + 1] = 100;
          imgData.data[i * 4 + 2] = 100;
          imgData.data[i * 4 + 3] = 255;
        } else if (showPressure) {
          const pVal = fluid.p[i] * 5000;
          if (pVal > 0) {
            imgData.data[i * 4] = Math.min(pVal, 255);
            imgData.data[i * 4 + 1] = 0;
            imgData.data[i * 4 + 2] = 0;
          } else {
            imgData.data[i * 4] = 0;
            imgData.data[i * 4 + 1] = 0;
            imgData.data[i * 4 + 2] = Math.min(-pVal, 255);
          }
          imgData.data[i * 4 + 3] = 255;
        } else {
          const d = fluid.density[i];
          imgData.data[i * 4] = Math.min(d * 25.5, 255) * 0.1;
          imgData.data[i * 4 + 1] = Math.min(d * 204, 255);
          imgData.data[i * 4 + 2] = Math.min(d * 255, 255);
          imgData.data[i * 4 + 3] = 255;
          fluid.density[i] *= 0.995;
        }
      }

      offCtx.putImageData(imgData, 0, 0);
      
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);

      if (showVelocity) {
        const scaleX = canvas.width / (N + 2);
        const scaleY = canvas.height / (N + 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let j = 1; j <= N; j += 2) {
          for (let i = 1; i <= N; i += 2) {
            const x = i * scaleX;
            const y = j * scaleY;
            const vx = fluid.Vx[IX(i, j)] * 10;
            const vy = fluid.Vy[IX(i, j)] * 10;
            ctx.moveTo(x, y);
            ctx.lineTo(x + vx * scaleX, y + vy * scaleY);
          }
        }
        ctx.stroke();
      }

      const renderEndTime = performance.now();
      const renderMs = renderEndTime - renderStartTime;

      const frameMs = performance.now() - frameStartTime;
      
      perf.history[perf.historyIdx] = frameMs;
      perf.logicHistory[perf.historyIdx] = logicMs;
      perf.renderHistory[perf.historyIdx] = renderMs;
      perf.historyIdx = (perf.historyIdx + 1) % perf.history.length;
      perf.frames++;

      if (perf.frames % 10 === 0) {
        let sumFrame = 0, sumLogic = 0, sumRender = 0;
        for (let i = 0; i < perf.history.length; i++) {
          sumFrame += perf.history[i];
          sumLogic += perf.logicHistory[i];
          sumRender += perf.renderHistory[i];
        }
        perf.avgFrameTime = sumFrame / perf.history.length;
        perf.avgLogicTime = sumLogic / perf.history.length;
        perf.avgRenderTime = sumRender / perf.history.length;
        perf.fps = 1000 / (perf.avgFrameTime || 1);
        forceRender({});
      }

      const pCanvas = perfCanvasRef.current;
      if (pCanvas && pCanvas.offsetParent !== null) {
        const pCtx = pCanvas.getContext('2d');
        if (pCtx) {
          const w = pCanvas.width;
          const h = pCanvas.height;
          pCtx.clearRect(0, 0, w, h);
          pCtx.fillStyle = '#0f172a';
          pCtx.fillRect(0, 0, w, h);

          const maxMs = 33.3;
          const y60fps = h - (16.6 / maxMs) * h;
          
          pCtx.strokeStyle = '#334155';
          pCtx.lineWidth = 1;
          pCtx.beginPath();
          pCtx.moveTo(0, y60fps);
          pCtx.lineTo(w, y60fps);
          pCtx.stroke();

          const barW = w / perf.history.length;
          for (let i = 0; i < perf.history.length; i++) {
            const idx = (perf.historyIdx + i) % perf.history.length;
            const lMs = perf.logicHistory[idx];
            const rMs = perf.renderHistory[idx];
            
            const lH = (lMs / maxMs) * h;
            const rH = (rMs / maxMs) * h;
            const x = i * barW;

            pCtx.fillStyle = '#3b82f6';
            pCtx.fillRect(x, h - lH, barW - 1, lH);
            
            pCtx.fillStyle = '#10b981';
            pCtx.fillRect(x, h - lH - rH, barW - 1, rH);
          }
        }
      }

      animationId = requestAnimationFrame(renderLoop);
    };

    animationId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationId);
  }, [preset, showPressure, showVelocity]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    const rect = canvasRef.current!.getBoundingClientRect();
    lastMouse.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    injectFluid(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    injectFluid(e);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const injectFluid = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const gridX = Math.floor((x / canvas.width) * (N + 2));
    const gridY = Math.floor((y / canvas.height) * (N + 2));
    
    const dx = x - lastMouse.current.x;
    const dy = y - lastMouse.current.y;
    
    fluidRef.current.addDensity(gridX, gridY, 500);
    fluidRef.current.addVelocity(gridX, gridY, dx * 0.5, dy * 0.5);
    
    lastMouse.current = { x, y };
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl z-10">
        <div className="p-6 pb-4 border-b border-slate-800">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            Fluid Sandbox
          </h1>
          <p className="text-xs text-slate-400 mt-1">Stable Fluids (Navier-Stokes)</p>
        </div>

        <div className="flex border-b border-slate-800 text-sm">
          {(['controls', 'presets', 'visuals', 'perf'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-center capitalize transition-colors ${
                activeTab === tab 
                  ? 'bg-slate-800 text-cyan-400 font-medium border-b-2 border-cyan-500' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'controls' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <label className="text-slate-300 uppercase tracking-wider font-semibold">Viscosity</label>
                    <span className="text-cyan-400 font-mono">{viscosity.toExponential(2)}</span>
                  </div>
                  <input 
                    type="range" min="0" max="0.001" step="0.00001" 
                    value={viscosity} onChange={(e) => setViscosity(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <label className="text-slate-300 uppercase tracking-wider font-semibold">Diffusion</label>
                    <span className="text-cyan-400 font-mono">{diffusion.toFixed(4)}</span>
                  </div>
                  <input 
                    type="range" min="0" max="0.01" step="0.0001" 
                    value={diffusion} onChange={(e) => setDiffusion(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <label className="text-slate-300 uppercase tracking-wider font-semibold">Timestep (dt)</label>
                    <span className="text-cyan-400 font-mono">{dt.toFixed(3)}</span>
                  </div>
                  <input 
                    type="range" min="0.01" max="0.5" step="0.01" 
                    value={dt} onChange={(e) => setDt(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>

              <button 
                onClick={handleReset}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-600 transition-colors active:scale-95"
              >
                Reset Simulation
              </button>
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <button
                onClick={() => setPreset('none')}
                className={`w-full p-3 text-left rounded-lg border transition-all ${preset === 'none' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}
              >
                <div className="font-medium text-sm">Interactive Mode</div>
                <div className="text-xs opacity-70 mt-1">Paint dye and forces freely.</div>
              </button>
              <button
                onClick={() => setPreset('smoke_jet')}
                className={`w-full p-3 text-left rounded-lg border transition-all ${preset === 'smoke_jet' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}
              >
                <div className="font-medium text-sm">Smoke Jet</div>
                <div className="text-xs opacity-70 mt-1">Continuous upward flow from the bottom.</div>
              </button>
              <button
                onClick={() => setPreset('vortex_street')}
                className={`w-full p-3 text-left rounded-lg border transition-all ${preset === 'vortex_street' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}
              >
                <div className="font-medium text-sm">Vortex Street</div>
                <div className="text-xs opacity-70 mt-1">Flow interacting with a central obstacle.</div>
              </button>
            </div>
          )}

          {activeTab === 'visuals' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <label className="flex items-center gap-3 cursor-pointer group p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors">
                <div className={`relative w-10 h-5 transition-colors rounded-full ${showPressure ? 'bg-red-500' : 'bg-cyan-500'}`}>
                  <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${showPressure ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200">
                    {showPressure ? 'Pressure Map' : 'Dye Map'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {showPressure ? 'Red (+), Blue (-)' : 'Vivid Cyan'}
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors">
                <input 
                  type="checkbox" 
                  checked={showVelocity} 
                  onChange={(e) => setShowVelocity(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 bg-slate-700"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200">Velocity Vectors</span>
                  <span className="text-xs text-slate-400">Show directional flow lines</span>
                </div>
              </label>
            </div>
          )}

          <div className={`space-y-4 animate-in fade-in duration-200 ${activeTab === 'perf' ? 'block' : 'hidden'}`}>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">FPS</div>
                <div className="text-xl font-mono text-cyan-400">{Math.round(perfData.current.fps)}</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Frame Time</div>
                <div className="text-xl font-mono text-slate-200">{perfData.current.avgFrameTime.toFixed(1)}<span className="text-sm text-slate-500 ml-1">ms</span></div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div> Logic
                </div>
                <div className="text-xl font-mono text-slate-200">{perfData.current.avgLogicTime.toFixed(1)}<span className="text-sm text-slate-500 ml-1">ms</span></div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Render
                </div>
                <div className="text-xl font-mono text-slate-200">{perfData.current.avgRenderTime.toFixed(1)}<span className="text-sm text-slate-500 ml-1">ms</span></div>
              </div>
            </div>
            
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Frame History</div>
              <canvas ref={perfCanvasRef} width={240} height={100} className="w-full h-24 bg-slate-900 rounded border border-slate-700/50" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-black cursor-crosshair">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
    </div>
  );
}