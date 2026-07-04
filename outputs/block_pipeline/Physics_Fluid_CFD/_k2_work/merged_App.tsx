import React, { useEffect, useRef, useState, useCallback } from 'react';

const N = 64;
const SIZE = (N + 2) * (N + 2);
const ITER = 4;

const IX = (x: number, y: number) => x + y * (N + 2);

class FluidSolver {
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
    const idx = IX(x, y);
    if (idx >= 0 && idx < SIZE) this.density[idx] += amount;
  }

  addVelocity(x: number, y: number, amountX: number, amountY: number) {
    const idx = IX(x, y);
    if (idx >= 0 && idx < SIZE) {
      this.Vx[idx] += amountX;
      this.Vy[idx] += amountY;
    }
  }

  setBnd(b: number, x: Float32Array) {
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

  linSolve(b: number, x: Float32Array, x0: Float32Array, a: number, c: number) {
    const cRecip = 1.0 / c;
    for (let k = 0; k < ITER; k++) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          if (!this.obstacle[IX(i, j)]) {
            x[IX(i, j)] =
              (x0[IX(i, j)] +
                a *
                  (x[IX(i + 1, j)] +
                    x[IX(i - 1, j)] +
                    x[IX(i, j + 1)] +
                    x[IX(i, j - 1)])) *
              cRecip;
          }
        }
      }
      this.setBnd(b, x);
    }
  }

  diffuse(b: number, x: Float32Array, x0: Float32Array, diff: number, dt: number) {
    const a = dt * diff * N * N;
    this.linSolve(b, x, x0, a, 1 + 4 * a);
  }

  advect(b: number, d: Float32Array, d0: Float32Array, u: Float32Array, v: Float32Array, dt: number) {
    let i0, j0, i1, j1;
    let x, y, s0, t0, s1, t1;
    let dt0 = dt * N;

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
    this.setBnd(b, d);
  }

  project(u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array) {
    const h = 1.0 / N;
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        if (!this.obstacle[IX(i, j)]) {
          div[IX(i, j)] =
            -0.5 *
            h *
            (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)]);
          p[IX(i, j)] = 0;
        }
      }
    }
    this.setBnd(0, div);
    this.setBnd(0, p);
    this.linSolve(0, p, div, 1, 4);

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        if (!this.obstacle[IX(i, j)]) {
          u[IX(i, j)] -= 0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)]) / h;
          v[IX(i, j)] -= 0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)]) / h;
        }
      }
    }
    this.setBnd(1, u);
    this.setBnd(2, v);
  }

  step() {
    this.Vx0.set(this.Vx);
    this.Vy0.set(this.Vy);
    this.diffuse(1, this.Vx0, this.Vx, this.visc, this.dt);
    this.diffuse(2, this.Vy0, this.Vy, this.visc, this.dt);
    this.project(this.Vx0, this.Vy0, this.p, this.div);
    this.advect(1, this.Vx, this.Vx0, this.Vx0, this.Vy0, this.dt);
    this.advect(2, this.Vy, this.Vy0, this.Vx0, this.Vy0, this.dt);
    this.project(this.Vx, this.Vy, this.p, this.div);

    this.s.set(this.density);
    this.diffuse(0, this.s, this.density, this.diff, this.dt);
    this.advect(0, this.density, this.s, this.Vx, this.Vy, this.dt);
  }
}

class FluidParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  drag: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 15 + 5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.maxLife = Math.random() * 60 + 40;
    this.size = Math.random() * 15 + 5;
    this.color = color;
    this.drag = 0.92;
  }

  update() {
    this.vx += Math.sin(this.y * 0.02) * 0.8;
    this.vy += Math.cos(this.x * 0.02) * 0.8;
    this.vx *= this.drag;
    this.vy *= this.drag;
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 1 / this.maxLife;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.life <= 0) return;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.life;
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

export default function App() {
  const [viscosity, setViscosity] = useState<number>(0.00001);
  const [diffusion, setDiffusion] = useState<number>(0.0001);
  const [timestep, setTimestep] = useState<number>(0.1);
  const [showPressure, setShowPressure] = useState<boolean>(false);
  const [showVelocity, setShowVelocity] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>('interactive');
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetCount, setResetCount] = useState<number>(0);
  const [stats, setStats] = useState({ fps: 0, frameMs: 0, logicMs: 0, renderMs: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const perfCanvasRef = useRef<HTMLCanvasElement>(null);
  const fluidRef = useRef<FluidSolver>(new FluidSolver(timestep, diffusion, viscosity));
  const particlesRef = useRef<FluidParticle[]>([]);
  
  const isMouseDown = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const perfData = useRef({
    frames: 0,
    lastTime: performance.now(),
    history: new Array(60).fill(0),
    logicHistory: new Array(60).fill(0),
    renderHistory: new Array(60).fill(0),
    historyIdx: 0,
  });

  const dyeColors = ['#06b6d4', '#ec4899', '#8b5cf6', '#10b981'];

  useEffect(() => {
    fluidRef.current.visc = viscosity;
    fluidRef.current.diff = diffusion;
    fluidRef.current.dt = timestep;
  }, [viscosity, diffusion, timestep]);

  useEffect(() => {
    const fluid = fluidRef.current;
    fluid.reset();
    if (activePreset === 'vortex') {
      const ox = Math.floor(N / 4);
      const oy = Math.floor(N / 2);
      const r = 4;
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          if ((i - ox) * (i - ox) + (j - oy) * (j - oy) <= r * r) {
            fluid.obstacle[IX(i, j)] = 1;
          }
        }
      }
    }
  }, [activePreset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const offCanvas = offscreenCanvasRef.current;
    offCanvas.width = N;
    offCanvas.height = N;
    const offCtx = offCanvas.getContext('2d');
    const imgData = offCtx?.createImageData(N, N);
    const pCanvas = perfCanvasRef.current;
    const pCtx = pCanvas?.getContext('2d');

    if (!canvas || !ctx || !offCtx || !imgData || !pCanvas || !pCtx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    let animationId: number;

    const renderLoop = (time: number) => {
      const fluid = fluidRef.current;
      const perf = perfData.current;

      const frameStartTime = performance.now();
      perf.lastTime = frameStartTime;

      const logicStartTime = performance.now();

      if (activePreset === 'smoke') {
        const cx = Math.floor(N / 2);
        const cy = N - 2;
        for (let i = -1; i <= 1; i++) {
          fluid.addDensity(cx + i, cy, 200);
          fluid.addVelocity(cx + i, cy, (Math.random() - 0.5) * 5, -150);
        }
      } else if (activePreset === 'vortex') {
        for (let j = 1; j <= N; j++) {
          fluid.addDensity(2, j, 150);
          const perturbation = Math.sin(time * 0.005 + j * 0.5) * 15;
          fluid.addVelocity(2, j, 100 + perturbation, 0);
        }
      }

      for (let i = 0; i < SIZE; i++) {
        fluid.density[i] *= 0.995;
      }

      fluid.step();
      const logicEndTime = performance.now();
      const logicMs = logicEndTime - logicStartTime;

      const renderStartTime = performance.now();
      const data = imgData.data;
      
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          const idx = IX(i, j);
          const px = ((j - 1) * N + (i - 1)) * 4;
          
          if (fluid.obstacle[idx]) {
            data[px] = 100;
            data[px + 1] = 100;
            data[px + 2] = 100;
            data[px + 3] = 255;
          } else if (showPressure) {
            const p = fluid.p[idx] * 5000;
            data[px] = p > 0 ? Math.min(255, p) : 0;
            data[px + 1] = 0;
            data[px + 2] = p < 0 ? Math.min(255, -p) : 0;
            data[px + 3] = 255;
          } else {
            const d = fluid.density[idx];
            data[px] = Math.min(d * 0.1, 255);
            data[px + 1] = Math.min(d * 0.8, 255);
            data[px + 2] = Math.min(d * 1.5, 255);
            data[px + 3] = 255;
          }
        }
      }

      offCtx.putImageData(imgData, 0, 0);
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(offCanvas, 0, 0, canvas.width, canvas.height);

      if (showVelocity) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const scaleX = canvas.width / N;
        const scaleY = canvas.height / N;
        for (let j = 1; j <= N; j += 2) {
          for (let i = 1; i <= N; i += 2) {
            const idx = IX(i, j);
            const vx = fluid.Vx[idx];
            const vy = fluid.Vy[idx];
            const x = (i - 0.5) * scaleX;
            const y = (j - 0.5) * scaleY;
            ctx.moveTo(x, y);
            ctx.lineTo(x + vx * scaleX * 0.5, y + vy * scaleY * 0.5);
          }
        }
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'lighter';
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        p.update();
        p.draw(ctx);
      });

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
        setStats({
          fps: Math.round(1000 / (sumFrame / perf.history.length || 1)),
          frameMs: sumFrame / perf.history.length,
          logicMs: sumLogic / perf.history.length,
          renderMs: sumRender / perf.history.length
        });
      }

      drawPerformanceGraph(pCtx, pCanvas.width, pCanvas.height, perf);

      animationId = requestAnimationFrame(renderLoop);
    };

    animationId = requestAnimationFrame(renderLoop);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [showPressure, showVelocity, activePreset]);

  const drawPerformanceGraph = (ctx: CanvasRenderingContext2D, w: number, h: number, perf: any) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, w, h);

    const maxMs = 33.3;
    const y60fps = h - (16.6 / maxMs) * h;
    
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y60fps);
    ctx.lineTo(w, y60fps);
    ctx.stroke();

    ctx.strokeStyle = '#06b6d4';
    ctx.beginPath();
    for (let i = 0; i < perf.history.length; i++) {
      const idx = (perf.historyIdx + i) % perf.history.length;
      const ms = perf.history[idx];
      const x = (i / perf.history.length) * w;
      const y = h - (ms / maxMs) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isMouseDown.current = true;
    const rect = canvasRef.current!.getBoundingClientRect();
    lastMousePos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    injectFluid(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMouseDown.current) return;
    injectFluid(e);
  };

  const handlePointerUp = () => {
    isMouseDown.current = false;
  };

  const injectFluid = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const gridX = Math.floor((x / canvas.width) * N) + 1;
    const gridY = Math.floor((y / canvas.height) * N) + 1;
    
    const dx = x - lastMousePos.current.x;
    const dy = y - lastMousePos.current.y;
    
    if (gridX >= 1 && gridX <= N && gridY >= 1 && gridY <= N) {
      fluidRef.current.addDensity(gridX, gridY, 500);
      fluidRef.current.addVelocity(gridX, gridY, dx * 2, dy * 2);
    }
    
    lastMousePos.current = { x, y };
  };

  const triggerReset = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (isResetting) return;
    setIsResetting(true);
    setResetCount(prev => prev + 1);

    const rect = e.currentTarget.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    const newParticles: FluidParticle[] = [];
    for (let i = 0; i < 150; i++) {
      const color = dyeColors[Math.floor(Math.random() * dyeColors.length)];
      newParticles.push(new FluidParticle(originX, originY, color));
    }
    particlesRef.current.push(...newParticles);

    fluidRef.current.reset();

    setTimeout(() => {
      setIsResetting(false);
    }, 1200);
  }, [isResetting]);

  return (
    <div className="relative flex h-screen w-full bg-gray-950 text-gray-100 font-sans overflow-hidden selection:bg-cyan-500/30">
      
      <canvas 
        ref={canvasRef} 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="absolute inset-0 z-0 cursor-crosshair touch-none"
      />

      <div className="w-80 relative z-10 bg-gray-900/90 backdrop-blur-md border-r border-gray-800/60 p-6 flex flex-col gap-6 shadow-2xl overflow-y-auto">
        
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider">
            FLUID SANDBOX
          </h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Stable Fluids on Grid</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Presets</h2>
          <div className="grid grid-cols-3 gap-2">
            {['interactive', 'smoke', 'vortex'].map((preset) => (
              <button
                key={preset}
                onClick={() => setActivePreset(preset)}
                className={`py-2 px-1 text-xs font-medium rounded-lg transition-colors border ${
                  activePreset === preset 
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' 
                    : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                {preset.charAt(0).toUpperCase() + preset.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visualization</h2>
          
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`relative w-10 h-5 transition-colors rounded-full ${showPressure ? 'bg-red-500' : 'bg-cyan-500'}`}>
              <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${showPressure ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
              {showPressure ? 'Pressure Map' : 'Dye Map'}
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={showVelocity} 
              onChange={(e) => setShowVelocity(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900 bg-gray-700"
            />
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Velocity Vectors</span>
          </label>
        </div>

        <div className="space-y-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Parameters</h2>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label className="text-gray-400">Viscosity</label>
              <span className="text-cyan-400">{viscosity.toExponential(2)}</span>
            </div>
            <input 
              type="range" min="0" max="0.001" step="0.00001" 
              value={viscosity} onChange={(e) => setViscosity(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label className="text-gray-400">Diffusion</label>
              <span className="text-purple-400">{diffusion.toFixed(4)}</span>
            </div>
            <input 
              type="range" min="0" max="0.01" step="0.0001" 
              value={diffusion} onChange={(e) => setDiffusion(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label className="text-gray-400">Timestep</label>
              <span className="text-emerald-400">{timestep.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0.01" max="0.5" step="0.01" 
              value={timestep} onChange={(e) => setTimestep(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Performance</h2>
            <span className="text-xs font-mono text-cyan-400">{stats.fps} FPS</span>
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden p-2">
            <canvas ref={perfCanvasRef} width={260} height={60} className="w-full h-[60px]" />
            <div className="flex justify-between mt-2 text-[10px] font-mono text-gray-500">
              <span>Logic: {stats.logicMs.toFixed(1)}ms</span>
              <span>Render: {stats.renderMs.toFixed(1)}ms</span>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-gray-800/60">
          <div className="mb-3 flex justify-between items-end">
            <span className="text-[10px] text-gray-600 font-mono">RESETS: {resetCount.toString().padStart(3, '0')}</span>
          </div>

          <button
            onClick={triggerReset}
            disabled={isResetting}
            className="group relative w-full flex items-center justify-center p-[1px] rounded-xl overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            <span 
              className={`absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(6,182,212,1)_360deg)] transition-all duration-500
                ${isResetting ? 'animate-[spin_0.5s_linear_infinite] opacity-100' : 'animate-[spin_3s_linear_infinite] opacity-40 group-hover:opacity-100'}`} 
            />
            <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-xl group-hover:opacity-100 opacity-0 transition-opacity duration-500" />
            
            <div className="relative w-full bg-gray-900/90 backdrop-blur-sm rounded-xl px-6 py-3 flex items-center justify-center gap-3 transition-colors duration-300 group-hover:bg-gray-800/90">
              <svg 
                className={`w-4 h-4 transition-all duration-500 ${isResetting ? 'text-cyan-400 animate-spin' : 'text-gray-400 group-hover:text-cyan-400 group-hover:-rotate-90'}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className={`font-bold tracking-widest text-xs transition-colors duration-300 ${isResetting ? 'text-cyan-400' : 'text-gray-300 group-hover:text-white'}`}>
                {isResetting ? 'RESETTING...' : 'RESET SCENE'}
              </span>
            </div>

            <div className={`absolute inset-0 bg-cyan-500/20 rounded-xl transition-opacity duration-300 ${isResetting ? 'opacity-100' : 'opacity-0'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}