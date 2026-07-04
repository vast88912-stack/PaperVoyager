import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- FLUID SIMULATION CONSTANTS & HELPERS ---
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

  p: Float32Array; // Pressure
  div: Float32Array; // Divergence

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
    this.density[IX(x, y)] += amount;
  }

  addVelocity(x: number, y: number, amountX: number, amountY: number) {
    this.Vx[IX(x, y)] += amountX;
    this.Vy[IX(x, y)] += amountY;
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

    // Obstacle boundaries
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
    // Velocity step
    this.Vx0.set(this.Vx);
    this.Vy0.set(this.Vy);
    this.diffuse(1, this.Vx0, this.Vx, this.visc, this.dt);
    this.diffuse(2, this.Vy0, this.Vy, this.visc, this.dt);
    this.project(this.Vx0, this.Vy0, this.p, this.div);
    this.advect(1, this.Vx, this.Vx0, this.Vx0, this.Vy0, this.dt);
    this.advect(2, this.Vy, this.Vy0, this.Vx0, this.Vy0, this.dt);
    this.project(this.Vx, this.Vy, this.p, this.div);

    // Density step
    this.s.set(this.density);
    this.diffuse(0, this.s, this.density, this.diff, this.dt);
    this.advect(0, this.density, this.s, this.Vx, this.Vy, this.dt);
  }
}

// --- MAIN COMPONENT ---
export default function App() {
  // Fluid Settings
  const [viscosity, setViscosity] = useState<number>(0.00001);
  const [diffusion, setDiffusion] = useState<number>(0.0001);
  const [timestep, setTimestep] = useState<number>(0.1);
  const [viewPressure, setViewPressure] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>('none');

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const perfCanvasRef = useRef<HTMLCanvasElement>(null);
  const fluidRef = useRef<FluidSolver>(new FluidSolver(timestep, diffusion, viscosity));
  
  // Interaction State
  const isMouseDown = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Performance Tracking Refs
  const perfData = useRef({
    frames: 0,
    lastTime: performance.now(),
    history: new Array(100).fill(0),
    logicHistory: new Array(100).fill(0),
    renderHistory: new Array(100).fill(0),
    historyIdx: 0,
    fps: 0,
    avgFrameTime: 0,
    avgLogicTime: 0,
    avgRenderTime: 0
  });

  // Update Fluid Solver params when state changes
  useEffect(() => {
    fluidRef.current.visc = viscosity;
    fluidRef.current.diff = diffusion;
    fluidRef.current.dt = timestep;
  }, [viscosity, diffusion, timestep]);

  // Handle Presets
  useEffect(() => {
    const fluid = fluidRef.current;
    fluid.reset();
    if (activePreset === 'vortex') {
      // Create a block in the middle
      for (let j = N / 2 - 5; j <= N / 2 + 5; j++) {
        for (let i = N / 2 - 2; i <= N / 2 + 2; i++) {
          fluid.obstacle[IX(i, j)] = 1;
        }
      }
    }
  }, [activePreset]);

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const offCanvas = offscreenCanvasRef.current;
    offCanvas.width = N + 2;
    offCanvas.height = N + 2;
    const offCtx = offCanvas.getContext('2d');
    const imgData = offCtx?.createImageData(N + 2, N + 2);

    const pCanvas = perfCanvasRef.current;
    const pCtx = pCanvas?.getContext('2d');

    if (!canvas || !ctx || !offCtx || !imgData || !pCanvas || !pCtx) return;

    let animationId: number;

    const renderLoop = (time: number) => {
      const fluid = fluidRef.current;
      const perf = perfData.current;

      // --- PERFORMANCE: Start Frame ---
      const frameStartTime = performance.now();
      const dt = frameStartTime - perf.lastTime;
      perf.lastTime = frameStartTime;

      // --- LOGIC PHASE ---
      const logicStartTime = performance.now();

      // Apply preset continuous forces
      if (activePreset === 'smoke') {
        fluid.addDensity(Math.floor(N / 2), N - 2, 200);
        fluid.addVelocity(Math.floor(N / 2), N - 2, (Math.random() - 0.5) * 2, -15);
      } else if (activePreset === 'vortex') {
        for (let j = 1; j <= N; j++) {
          fluid.addDensity(2, j, Math.sin(j * 0.5 + time * 0.005) * 50 + 50);
          fluid.addVelocity(2, j, 5, 0);
        }
      }

      // Fade density slightly
      for (let i = 0; i < SIZE; i++) {
        fluid.density[i] *= 0.995;
      }

      fluid.step();
      const logicEndTime = performance.now();
      const logicMs = logicEndTime - logicStartTime;

      // --- RENDER PHASE ---
      const renderStartTime = performance.now();
      const data = imgData.data;
      
      for (let j = 0; j < N + 2; j++) {
        for (let i = 0; i < N + 2; i++) {
          const idx = IX(i, j);
          const px = (i + j * (N + 2)) * 4;
          
          if (fluid.obstacle[idx]) {
            data[px] = 100;     // R
            data[px + 1] = 100; // G
            data[px + 2] = 100; // B
            data[px + 3] = 255; // A
          } else if (viewPressure) {
            const p = fluid.p[idx] * 5000;
            data[px] = p > 0 ? p : 0;
            data[px + 1] = 0;
            data[px + 2] = p < 0 ? -p : 0;
            data[px + 3] = 255;
          } else {
            const d = fluid.density[idx];
            // Vivid neon cyan/blue mapping
            data[px] = Math.min(d * 0.1, 255);       // R
            data[px + 1] = Math.min(d * 0.8, 255);   // G
            data[px + 2] = Math.min(d * 2.5, 255);   // B
            data[px + 3] = 255;                      // A
          }
        }
      }

      offCtx.putImageData(imgData, 0, 0);
      
      // Draw scaled to main canvas
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(offCanvas, 0, 0, canvas.width, canvas.height);

      const renderEndTime = performance.now();
      const renderMs = renderEndTime - renderStartTime;

      // --- PERFORMANCE: End Frame & Metrics ---
      const frameMs = performance.now() - frameStartTime;
      
      perf.history[perf.historyIdx] = frameMs;
      perf.logicHistory[perf.historyIdx] = logicMs;
      perf.renderHistory[perf.historyIdx] = renderMs;
      perf.historyIdx = (perf.historyIdx + 1) % perf.history.length;
      perf.frames++;

      // Update averages every 10 frames to avoid jitter
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
      }

      // Draw Performance Graph
      drawPerformanceGraph(pCtx, pCanvas.width, pCanvas.height, perf);

      animationId = requestAnimationFrame(renderLoop);
    };

    animationId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationId);
  }, [viewPressure, activePreset]);

  // Performance Graph Renderer
  const drawPerformanceGraph = (ctx: CanvasRenderingContext2D, w: number, h: number, perf: any) => {
    ctx.clearRect(0, 0, w, h);
    
    // Background
    ctx.fillStyle = '#111827'; // gray-900
    ctx.fillRect(0, 0, w, h);

    // Grid lines (16.6ms target for 60fps)
    const maxMs = 33.3; // Scale up to 30fps drop
    const y60fps = h - (16.6 / maxMs) * h;
    
    ctx.strokeStyle = '#374151'; // gray-700
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y60fps);
    ctx.