import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Constants & Math ---
const N = 70;
const SIZE = (N + 2) * (N + 2);
const ITER = 10;

function IX(i: number, j: number) {
  return i + (N + 2) * j;
}

function set_bnd(b: number, x: Float32Array) {
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

function lin_solve(b: number, x: Float32Array, x0: Float32Array, a: number, c: number) {
  const cRecip = 1.0 / c;
  for (let k = 0; k < ITER; k++) {
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
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
    set_bnd(b, x);
  }
}

function advect(b: number, d: Float32Array, d0: Float32Array, u: Float32Array, v: Float32Array, dt: number) {
  let i0, j0, i1, j1;
  let x, y, s0, t0, s1, t1;
  const dt0 = dt * N;

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
  set_bnd(b, d);
}

function project(u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array) {
  const h = 1.0 / N;
  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      div[IX(i, j)] =
        -0.5 *
        h *
        (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)]);
      p[IX(i, j)] = 0;
    }
  }
  set_bnd(0, div);
  set_bnd(0, p);

  lin_solve(0, p, div, 1, 4);

  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      u[IX(i, j)] -= 0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)]) / h;
      v[IX(i, j)] -= 0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)]) / h;
    }
  }
  set_bnd(1, u);
  set_bnd(2, v);
}

// --- Fluid Class ---
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
  p: Float32Array; // Pressure field

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
  }

  reset() {
    this.s.fill(0);
    this.density.fill(0);
    this.Vx.fill(0);
    this.Vy.fill(0);
    this.Vx0.fill(0);
    this.Vy0.fill(0);
    this.p.fill(0);
  }

  addDensity(x: number, y: number, amount: number) {
    if (x >= 1 && x <= N && y >= 1 && y <= N) {
      this.density[IX(x, y)] += amount;
    }
  }

  addVelocity(x: number, y: number, amountX: number, amountY: number) {
    if (x >= 1 && x <= N && y >= 1 && y <= N) {
      this.Vx[IX(x, y)] += amountX;
      this.Vy[IX(x, y)] += amountY;
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
    const p = this.p;

    // Diffuse velocity
    if (visc > 0) {
      lin_solve(1, Vx0, Vx, visc * dt * N * N, 1 + 4 * visc * dt * N * N);
      lin_solve(2, Vy0, Vy, visc * dt * N * N, 1 + 4 * visc * dt * N * N);
    } else {
      Vx0.set(Vx);
      Vy0.set(Vy);
    }

    project(Vx0, Vy0, p, s); // s is used as div
    advect(1, Vx, Vx0, Vx0, Vy0, dt);
    advect(2, Vy, Vy0, Vx0, Vy0, dt);
    project(Vx, Vy, p, s);

    // Diffuse density
    if (diff > 0) {
      lin_solve(0, s, density, diff * dt * N * N, 1 + 4 * diff * dt * N * N);
    } else {
      s.set(density);
    }
    advect(0, density, s, Vx, Vy, dt);
    
    // Fade density slightly to simulate dissipation
    for (let i = 0; i < SIZE; i++) {
      density[i] = Math.max(0, density[i] - 0.5);
    }
  }
}

// --- React Component ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const fluidRef = useRef<Fluid | null>(null);
  const requestRef = useRef<number>();

  const [fps, setFps] = useState(0);
  const [showPressure, setShowPressure] = useState(false);
  const [viscosity, setViscosity] = useState<number>(0);
  const [diffusion, setDiffusion] = useState<number>(0);
  const [dt, setDt] = useState<number>(0.1);
  const [preset, setPreset] = useState<'custom' | 'smoke' | 'vortex'>('custom');

  const mouseRef = useRef({ x: 0, y: 0, px: 0, py: 0, down: false });
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const imageDataRef = useRef<ImageData | null>(null);

  useEffect(() => {
    fluidRef.current = new Fluid(dt, diffusion, viscosity);
    if (!hiddenCanvasRef.current) {
      const hc = document.createElement('canvas');
      hc.width = N;
      hc.height = N;
      hiddenCanvasRef.current = hc;
      const ctx = hc.getContext('2d');
      if (ctx) imageDataRef.current = ctx.createImageData(N, N);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []); // Run once

  // Update fluid parameters when state changes
  useEffect(() => {
    if (fluidRef.current) {
      fluidRef.current.visc = viscosity;
      fluidRef.current.diff = diffusion;
      fluidRef.current.dt = dt;
    }
  }, [viscosity, diffusion, dt]);

  const applyPreset = () => {
    if (!fluidRef.current) return;
    const f = fluidRef.current;
    if (preset === 'smoke') {
      const cx = Math.floor(N / 2);
      const cy = N - 2;
      for (let i = -2; i <= 2; i++) {
        f.addDensity(cx + i, cy, Math.random() * 200 + 100);
        f.addVelocity(cx + i, cy, (Math.random() - 0.5) * 5, -50);
      }
    } else if (preset === 'vortex') {
      // Inflow from left
      for (let j = N / 2 - 5; j <= N / 2 + 5; j++) {
        f.addDensity(2, j, 150);
        f.addVelocity(2, j, 30, 0);
      }
      // Obstacle forces (alternating swirl)
      const t = performance.now() * 0.005;
      const cx = Math.floor(N / 3);
      const cy = Math.floor(N / 2);
      f.addVelocity(cx, cy, 0, Math.sin(t) * 40);
      f.addVelocity(cx + 2, cy + 2, Math.cos(t) * 40, 0);
    }
  };

  const renderFrame = useCallback(() => {
    if (!fluidRef.current || !canvasRef.current || !hiddenCanvasRef.current || !imageDataRef.current) return;
    
    const f = fluidRef.current;

    // Handle interactive painting
    if (mouseRef.current.down && preset === 'custom') {
      const { x, y, px, py } = mouseRef.current;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = N / rect.width;
      const scaleY = N / rect.height;

      const gridX = Math.floor(x * scaleX);
      const gridY = Math.floor(y * scaleY);
      
      const dx = x - px;
      const dy = y - py;
      
      // Inject within a radius
      for(let i=-1; i<=1; i++) {
        for(let j=-1; j<=1; j++) {
           f.addDensity(gridX + i, gridY + j, 200);
           f.addVelocity(gridX + i, gridY + j, dx * 5, dy * 5);
        }
      }
      mouseRef.current.px = x;
      mouseRef.current.py = y;
    }

    applyPreset();
    f.step();

    // Render logic
    const imgData = imageDataRef.current;
    const data = imgData.data;

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        const idx = IX(i, j);
        const pxIdx = ((j - 1) * N + (i - 1)) * 4;

        if (showPressure) {
          // Render pressure field
          // Stam's pressure ranges are usually small, scale it for visibility
          const p = f.p[idx] * 2000; 
          if (p > 0) {
            // Positive pressure: Red heatmap
            data[pxIdx] = Math.min(255, p * 2);     // R
            data[pxIdx + 1] = Math.min(255, p / 2); // G
            data[pxIdx + 2] = 0;                    // B
            data[pxIdx + 3] = 255;                  // A
          } else {
            // Negative pressure: Cyan heatmap
            const np = -p;
            data[pxIdx] = 0;                        // R
            data[pxIdx + 1] = Math.min(255, np * 2);// G
            data[pxIdx + 2] = Math.min(255, np * 2);// B
            data[pxIdx + 3] = 255;                  // A
          }
        } else {
          // Render Dye
          const d = f.density[idx];
          // Vivid cyan-purple styling
          data[pxIdx] = Math.min(255, d * 0.8);        // R
          data[pxIdx + 1] = Math.min(255, d * 0.2);    // G
          data[pxIdx + 2] = Math.min(255, d * 1.5);    // B
          data[pxIdx + 3] = 255;                       // A
        }
      }
    }

    // Draw to hidden canvas, then scale up to main canvas
    const hCtx = hiddenCanvasRef.current.getContext('2d');
    const ctx = canvasRef.current.getContext('2d');
    if (hCtx && ctx) {
      hCtx.putImageData(imgData, 0, 0);
      
      // Clear main canvas
      ctx.fillStyle = '#09090b'; // Tailwind zinc-950
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        hiddenCanvasRef.current,
        0, 0, N, N,
        0, 0, canvasRef.current.width, canvasRef.current.height
      );
    }

    // FPS Counter
    frameCountRef.current++;
    const now = performance.now();
    if (now - lastTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }

    requestRef.current = requestAnimationFrame(renderFrame);
  }, [showPressure, preset]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [renderFrame]);

  // --- Input Handlers ---
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mouseRef.current = { x, y, px: x, py: y, down: true };
    setPreset('custom');
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!mouseRef.current.down) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    mouseRef.current.px = mouseRef.current.x;
    mouseRef.current.py = mouseRef.current.y;
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
  };

  const handlePointerUp = () => {
    mouseRef.current.down = false;
  };

  const handleReset = () => {
    if (fluidRef.current) fluidRef.current.reset();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex items-center justify-center p-4">
      
      {/* Main Container */}
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-4 gap-6 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 shadow-2xl">
        
        {/* Canvas Area (Cols 1-3) */}
        <div className="lg:col-span-3 relative flex flex-col rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-inner group">
          {/* Header overlay */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none z-10">
            <div>
              <h1 className="text-xl font-black tracking-tight text-white drop-shadow-md">
                2D FLUID SANDBOX
              </h1>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mt-1">
                Navier-Stokes Solver
              </p>
            </div>
            <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/50 px-3 py-1.5 rounded-full flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${fps > 30 ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${fps > 30 ? 'bg-emerald-500' : 'bg-rose-600'}`}></span>
              </span>
              <span className="text-xs font-bold text-zinc-300 w-12 text-right">{fps} FPS</span>
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={800}
            height={800}
            className="w-full aspect-square object-cover touch-none cursor-crosshair"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />

          {/* Prompt Overlay */}
          {preset === 'custom' && !mouseRef.current.down && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-zinc-400 font-medium tracking-wide pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
              Click & drag to interact
            </div>
          )}
        </div>

        {/* Controls Panel (Col 4) */}
        <div className="flex flex-col gap-6 p-2 h-full">
          
          {/* Action Module: Toggle