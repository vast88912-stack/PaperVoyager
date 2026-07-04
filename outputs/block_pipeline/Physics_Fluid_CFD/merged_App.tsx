import React, { useEffect, useRef, useState, useCallback } from 'react';

const N = 64;
const ITER = 10;
const SIZE = (N + 2) * (N + 2);

function IX(x: number, y: number) {
  return x + (N + 2) * y;
}

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
  }

  addDensity(x: number, y: number, amount: number) {
    const index = IX(x, y);
    if (index >= 0 && index < SIZE) this.density[index] += amount;
  }

  addVelocity(x: number, y: number, amountX: number, amountY: number) {
    const index = IX(x, y);
    if (index >= 0 && index < SIZE) {
      this.Vx[index] += amountX;
      this.Vy[index] += amountY;
    }
  }

  step() {
    const visc = this.visc;
    const diff = this.diff;
    const dt = this.dt;
    const Vx = this.Vx;
    const Vy = this.Vy;
    const Vx0 = this.Vx0;
    const Vy0 = this.Vy0;
    const s = this.s;
    const density = this.density;

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
  }

  lin_solve(b: number, x: Float32Array, x0: Float32Array, a: number, c: number) {
    const cRecip = 1.0 / c;
    for (let k = 0; k < ITER; k++) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          x[IX(i, j)] =
            (x0[IX(i, j)] +
              a * (x[IX(i + 1, j)] + x[IX(i - 1, j)] + x[IX(i, j + 1)] + x[IX(i, j - 1)])) *
            cRecip;
        }
      }
      this.set_bnd(b, x);
    }
  }

  diffuse(b: number, x: Float32Array, x0: Float32Array, diff: number, dt: number) {
    const a = dt * diff * (N - 2) * (N - 2);
    this.lin_solve(b, x, x0, a, 1 + 6 * a);
  }

  advect(b: number, d: Float32Array, d0: Float32Array, u: Float32Array, v: Float32Array, dt: number) {
    let i0, j0, i1, j1;
    let x, y, s0, t0, s1, t1;
    let dt0 = dt * (N - 2);

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
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

  project(u: Float32Array, v: Float32Array, pOut: Float32Array, divOut: Float32Array) {
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        this.div[IX(i, j)] =
          (-0.5 * (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)])) / N;
        this.p[IX(i, j)] = 0;
      }
    }
    this.set_bnd(0, this.div);
    this.set_bnd(0, this.p);
    this.lin_solve(0, this.p, this.div, 1, 4);

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        u[IX(i, j)] -= 0.5 * N * (this.p[IX(i + 1, j)] - this.p[IX(i - 1, j)]);
        v[IX(i, j)] -= 0.5 * N * (this.p[IX(i, j + 1)] - this.p[IX(i, j - 1)]);
      }
    }
    this.set_bnd(1, u);
    this.set_bnd(2, v);
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

interface PerformanceStats {
  fps: number;
  avgFps: number;
  low1Percent: number;
  frameTime: number;
  avgFrameTime: number;
  memoryUsage: number | null;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const perfCanvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  
  const fluidRef = useRef<Fluid>(new Fluid(0.1, 0.00001, 0.0000001));
  const requestRef = useRef<number>();
  const particlesRef = useRef<FluidParticle[]>([]);
  
  const [viscosity, setViscosity] = useState<number>(0.0000001);
  const [diffusion, setDiffusion] = useState<number>(0.00001);
  const [dt, setDt] = useState<number>(0.1);
  
  const [showPressure, setShowPressure] = useState<boolean>(false);
  const [showVelocity, setShowVelocity] = useState<boolean>(false);
  const [mode, setMode] = useState<'interactive' | 'smoke' | 'vortex'>('interactive');
  
  const [isResetting, setIsResetting] = useState(false);
  const [resetCount, setResetCount] = useState(0);

  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0, avgFps: 0, low1Percent: 0, frameTime: 0, avgFrameTime: 0, memoryUsage: null,
  });
  const [showFrameTime, setShowFrameTime] = useState(true);
  const [artificialLoad, setArtificialLoad] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const lastTimeRef = useRef<number>(performance.now());
  const frameTimesRef = useRef<number[]>([]);
  const lastStateUpdateTimeRef = useRef<number>(performance.now());
  const MAX_HISTORY = 120;

  const isMouseDown = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    offscreenCanvasRef.current.width = N;
    offscreenCanvasRef.current.height = N;
  }, []);

  useEffect(() => {
    if (fluidRef.current) {
      fluidRef.current.visc = viscosity;
      fluidRef.current.diff = diffusion;
      fluidRef.current.dt = dt;
    }
  }, [viscosity, diffusion, dt]);

  const drawPerfGraph = useCallback((frameTimes: number[]) => {
    const canvas = perfCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (frameTimes.length === 0) return;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < height; i += 20) {
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
    }
    for (let i = 0; i < width; i += 40) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
    }
    ctx.stroke();

    const targetY = height - (16.6 / 50) * height;
    ctx.strokeStyle = '#eab308';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(width, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.strokeStyle = showFrameTime ? '#06b6d4' : '#d946ef';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    const stepX = width / (MAX_HISTORY - 1);
    
    frameTimes.forEach((time, index) => {
      const x = index * stepX;
      let normalizedValue;
      if (showFrameTime) {
        normalizedValue = Math.min(time, 50) / 50; 
      } else {
        const fps = time > 0 ? 1000 / time : 0;
        normalizedValue = Math.min(fps, 120) / 120;
      }
      const y = height - normalizedValue * height;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.shadowBlur = 10;
    ctx.shadowColor = showFrameTime ? '#06b6d4' : '#d946ef';
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fillStyle = showFrameTime ? 'rgba(6, 182, 212, 0.1)' : 'rgba(217, 70, 239, 0.1)';
    ctx.fill();
  }, [showFrameTime]);

  const updateStats = useCallback((times: number[]) => {
    if (times.length === 0) return;
    const currentFrameTime = times[times.length - 1];
    const currentFps = currentFrameTime > 0 ? 1000 / currentFrameTime : 0;
    const sum = times.reduce((a, b) => a + b, 0);
    const avgFrameTime = sum / times.length;
    const avgFps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;

    const sortedTimes = [...times].sort((a, b) => b - a);
    const onePercentCount = Math.max(1, Math.floor(times.length * 0.01));
    const onePercentSum = sortedTimes.slice(0, onePercentCount).reduce((a, b) => a + b, 0);
    const avgOnePercentTime = onePercentSum / onePercentCount;
    const low1Percent = avgOnePercentTime > 0 ? 1000 / avgOnePercentTime : 0;

    let memoryUsage = null;
    const perf = performance as any;
    if (perf && perf.memory) {
      memoryUsage = perf.memory.usedJSHeapSize / (1024 * 1024);
    }

    setStats({
      fps: Math.round(currentFps),
      avgFps: Math.round(avgFps),
      low1Percent: Math.round(low1Percent),
      frameTime: Number(currentFrameTime.toFixed(1)),
      avgFrameTime: Number(avgFrameTime.toFixed(1)),
      memoryUsage: memoryUsage ? Number(memoryUsage.toFixed(1)) : null,
    });
  }, []);

  const renderLoop = useCallback((time: number) => {
    if (isPaused) {
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    if (artificialLoad > 0) {
      const startBlock = performance.now();
      while (performance.now() - startBlock < artificialLoad) {}
    }

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    frameTimesRef.current.push(deltaTime);
    if (frameTimesRef.current.length > MAX_HISTORY) {
      frameTimesRef.current.shift();
    }

    drawPerfGraph(frameTimesRef.current);

    if (time - lastStateUpdateTimeRef.current > 250) {
      updateStats(frameTimesRef.current);
      lastStateUpdateTimeRef.current = time;
    }

    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    const fluid = fluidRef.current;
    if (!canvas || !offscreen || !fluid) return;

    const ctx = canvas.getContext('2d');
    const offCtx = offscreen.getContext('2d');
    if (!ctx || !offCtx) return;

    if (mode === 'smoke') {
      const cx = Math.floor(N / 2);
      const cy = N - 2;
      for (let i = -2; i <= 2; i++) {
        fluid.addDensity(cx + i, cy, 200);
        fluid.addVelocity(cx + i, cy, (Math.random() - 0.5) * 10, -150);
      }
    } else if (mode === 'vortex') {
      for (let i = 1; i <= N; i++) {
        fluid.addDensity(2, i, 150);
        const perturbation = Math.sin(time * 0.005 + i * 0.5) * 15;
        fluid.addVelocity(2, i, 100 + perturbation, 0);
      }
      const ox = Math.floor(N / 4);
      const oy = Math.floor(N / 2);
      const r = 4;
      for (let i = -r; i <= r; i++) {
        for (let j = -r; j <= r; j++) {
          if (i * i + j * j <= r * r) {
            fluid.Vx[IX(ox + i, oy + j)] = 0;
            fluid.Vy[IX(ox + i, oy + j)] = 0;
            fluid.density[IX(ox + i, oy + j)] = 0;
          }
        }
      }
    }

    fluid.step();

    const imgData = offCtx.createImageData(N, N);
    const data = imgData.data;

    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const idx = IX(i + 1, j + 1);
        const pixelIdx = (i + j * N) * 4;

        if (showPressure) {
          const p = fluid.p[idx] * 5000;
          data[pixelIdx] = p > 0 ? Math.min(255, p) : 0;
          data[pixelIdx + 1] = 0;
          data[pixelIdx + 2] = p < 0 ? Math.min(255, -p) : 0;
          data[pixelIdx + 3] = 255;
        } else {
          const d = fluid.density[idx];
          fluid.density[idx] *= 0.995;
          data[pixelIdx] = Math.min(255, d * 0.2);
          data[pixelIdx + 1] = Math.min(255, d * 0.8);
          data[pixelIdx + 2] = Math.min(255, d * 1.5);
          data[pixelIdx + 3] = 255;
        }

        if (mode === 'vortex') {
          const ox = Math.floor(N / 4);
          const oy = Math.floor(N / 2);
          const r = 4;
          if ((i + 1 - ox) * (i + 1 - ox) + (j + 1 - oy) * (j + 1 - oy) <= r * r) {
            data[pixelIdx] = 100;
            data[pixelIdx + 1] = 100;
            data[pixelIdx + 2] = 100;
            data[pixelIdx + 3] = 255;
          }
        }
      }
    }

    offCtx.putImageData(imgData, 0, 0);

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);

    if (showVelocity) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
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

    if (particlesRef.current.length > 0) {
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        p.update();
        p.draw(ctx);
      });
    }

    requestRef.current = requestAnimationFrame(renderLoop);
  }, [isPaused, artificialLoad, drawPerfGraph, updateStats, mode, showPressure, showVelocity]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [renderLoop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const perfCanvas = perfCanvasRef.current;
    if (canvas) {
      const resize = () => {
        const rect = canvas.parentElement!.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      };
      window.addEventListener('resize', resize);
      resize();
      return () => window.removeEventListener('resize', resize);
    }
    if (perfCanvas) {
      const dpr = window.devicePixelRatio || 1;
      const rect = perfCanvas.getBoundingClientRect();
      perfCanvas.width = rect.width * dpr;
      perfCanvas.height = rect.height * dpr;
      const ctx = perfCanvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isMouseDown.current = true;
    const rect = canvasRef.current!.getBoundingClientRect();
    lastMouse.current = {
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
    if (!canvas || !fluidRef.current) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const gridX = Math.floor((x / canvas.width) * N) + 1;
    const gridY = Math.floor((y / canvas.height) * N) + 1;
    
    const dx = x - lastMouse.current.x;
    const dy = y - lastMouse.current.y;
    
    if (gridX >= 1 && gridX <= N && gridY >= 1 && gridY <= N) {
      fluidRef.current.addDensity(gridX, gridY, 500);
      fluidRef.current.addVelocity(gridX, gridY, dx * 5, dy * 5);
    }
    
    lastMouse.current = { x, y };
  };

  const triggerReset = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (isResetting) return;
    setIsResetting(true);
    setResetCount(prev => prev + 1);

    if (fluidRef.current) {
      fluidRef.current.reset();
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    
    if (canvasRect) {
      const originX = rect.left - canvasRect.left + rect.width / 2;
      const originY = rect.top - canvasRect.top + rect.height / 2;
      const dyeColors = ['#06b6d4', '#ec4899', '#8b5cf6', '#10b981'];
      const newParticles: FluidParticle[] = [];
      for (let i = 0; i < 150; i++) {
        const color = dyeColors[Math.floor(Math.random() * dyeColors.length)];
        newParticles.push(new FluidParticle(originX, originY, color));
      }
      particlesRef.current.push(...newParticles);
    }

    setTimeout(() => setIsResetting(false), 1200);
  }, [isResetting]);

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-500';
  };

  return (
    <div className="flex h-screen w-full bg-neutral-950 text-neutral-200 font-sans overflow-hidden selection:bg-cyan-500/30">
      <div className="w-96 bg-neutral-900 border-r border-neutral-800 flex flex-col h-full overflow-y-auto shadow-2xl z-10">
        <div className="p-6 border-b border-neutral-800">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            Fluid Sandbox
          </h1>
          <p className="text-xs text-neutral-400 mt-1 uppercase tracking-widest">Stable Fluids on Grid</p>
        </div>

        <div className="p-6 space-y-8 flex-1">
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Presets</h2>
            <div className="grid grid-cols-3 gap-2">
              {(['interactive', 'smoke', 'vortex'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); fluidRef.current?.reset(); }}
                  className={`py-2 px-1 text-xs rounded-lg font-medium transition-colors ${
                    mode === m ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Visualization</h2>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`relative w-10 h-5 transition-colors rounded-full ${showPressure ? 'bg-red-500' : 'bg-cyan-500'}`}>
                <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${showPressure ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <span className="text-sm font-medium group-hover:text-white transition-colors">
                {showPressure ? 'Pressure Map (Red/Blue)' : 'Dye Map (Cyan)'}
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={showVelocity} 
                onChange={(e) => setShowVelocity(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-neutral-900 bg-neutral-700"
              />
              <span className="text-sm font-medium group-hover:text-white transition-colors">Show Velocity Vectors</span>
            </label>
          </div>

          <div className="space-y-5">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Parameters</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <label className="text-neutral-400">Viscosity</label>
                <span className="text-cyan-400">{viscosity.toExponential(2)}</span>
              </div>
              <input 
                type="range" min="0" max="0.001" step="0.00001" 
                value={viscosity} onChange={(e) => setViscosity(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <label className="text-neutral-400">Diffusion</label>
                <span className="text-purple-400">{diffusion.toFixed(5)}</span>
              </div>
              <input 
                type="range" min="0" max="0.001" step="0.00001" 
                value={diffusion} onChange={(e) => setDiffusion(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <label className="text-neutral-400">Timestep</label>
                <span className="text-emerald-400">{dt.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0.01" max="0.5" step="0.01" 
                value={dt} onChange={(e) => setDt(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-neutral-800">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Performance</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setArtificialLoad(prev => prev === 0 ? 20 : 0)}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                    artificialLoad > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  LOAD
                </button>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="w-6 h-6 flex items-center justify-center bg-neutral-800 text-neutral-300 hover:bg-neutral-700 rounded transition-colors text-xs"
                >
                  {isPaused ? '▶' : 'II'}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-neutral-950/50 rounded-lg p-3 border border-neutral-800/50">
                <span className="text-neutral-500 text-[10px] uppercase tracking-wider block mb-1">FPS</span>
                <div className={`text-2xl font-black tracking-tighter ${getFpsColor(stats.fps)}`}>{stats.fps}</div>
                <div className="text-[10px] text-neutral-400 mt-1">1% LOW: <span className="text-red-400">{stats.low1Percent}</span></div>
              </div>
              <div className="bg-neutral-950/50 rounded-lg p-3 border border-neutral-800/50">
                <span className="text-neutral-500 text-[10px] uppercase tracking-wider block mb-1">Frame Time</span>
                <div className="text-2xl font-black tracking-tighter text-cyan-400">{stats.frameTime.toFixed(1)}<span className="text-xs">ms</span></div>
                <div className="text-[10px] text-neutral-400 mt-1">AVG: {stats.avgFrameTime}ms</div>
              </div>
            </div>

            <div className="relative w-full h-24 bg-neutral-950/50 rounded-lg border border-neutral-800/50 overflow-hidden">
              <div className="absolute top-1 right-1 flex bg-neutral-900 rounded p-0.5 border border-neutral-800 z-10">
                <button onClick={() => setShowFrameTime(true)} className={`text-[9px] px-2 py-0.5 rounded-sm ${showFrameTime ? 'bg-cyan-500/20 text-cyan-400' : 'text-neutral-500'}`}>ms</button>
                <button onClick={() => setShowFrameTime(false)} className={`text-[9px] px-2 py-0.5 rounded-sm ${!showFrameTime ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'text-neutral-500'}`}>fps</button>
              </div>
              <canvas ref={perfCanvasRef} className="w-full h-full block" style={{ width: '100%', height: '100%' }} />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-neutral-800 bg-neutral-900/90 backdrop-blur-md">
          <div className="mb-3 flex justify-between items-end">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">System Status</span>
            <span className="text-[10px] text-neutral-600 font-mono">RESETS: {resetCount.toString().padStart(3, '0')}</span>
          </div>
          <button
            onClick={triggerReset}
            disabled={isResetting}
            className="group relative w-full flex items-center justify-center p-[1px] rounded-xl overflow-hidden transition-all duration-300 focus:outline-none"
          >
            <span className={`absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(6,182,212,1)_360deg)] transition-all duration-500 ${isResetting ? 'animate-[spin_0.5s_linear_infinite] opacity-100' : 'animate-[spin_3s_linear_infinite] opacity-40 group-hover:opacity-100'}`} />
            <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-xl group-hover:opacity-100 opacity-0 transition-opacity duration-500" />
            <div className="relative w-full bg-neutral-900 rounded-xl px-6 py-3 flex items-center justify-center gap-3 transition-colors duration-300 group-hover:bg-neutral-800">
              <svg className={`w-4 h-4 transition-all duration-500 ${isResetting ? 'text-cyan-400 animate-spin' : 'text-neutral-400 group-hover:text-cyan-400 group-hover:-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className={`font-bold tracking-widest text-xs transition-colors duration-300 ${isResetting ? 'text-cyan-400' : 'text-neutral-300 group-hover:text-white'}`}>
                {isResetting ? 'RESETTING...' : 'RESET SCENE'}
              </span>
            </div>
            <div className={`absolute inset-0 bg-cyan-500/20 rounded-xl transition-opacity duration-300 ${isResetting ? 'opacity-100' : 'opacity-0'}`} />
          </button>
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
        {mode === 'interactive' && (
          <div className="absolute top-6 left-6 pointer-events-none">
            <div className="bg-neutral-900/60 backdrop-blur-sm border border-neutral-800/50 rounded-lg px-4 py-2 text-xs text-neutral-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              Click and drag to interact with the fluid
            </div>
          </div>
        )}
      </div>
    </div>
  );
}