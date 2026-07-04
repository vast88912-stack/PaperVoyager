import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

// --- STABLE FLUIDS SOLVER ---
// A faithful implementation of Jos Stam's "Real-Time Fluid Dynamics for Games"
// Adapted for JavaScript/TypeScript.

class Fluid {
  N: number;
  size: number;
  dt: number;
  diff: number;
  visc: number;
  
  s: Float32Array;
  density: Float32Array;
  
  Vx: Float32Array;
  Vy: Float32Array;
  Vx0: Float32Array;
  Vy0: Float32Array;

  iter: number;

  constructor(N: number, diffusion: number, viscosity: number, dt: number) {
    this.N = N;
    this.dt = dt;
    this.diff = diffusion;
    this.visc = viscosity;
    this.size = (N + 2) * (N + 2);

    this.s = new Float32Array(this.size);
    this.density = new Float32Array(this.size);

    this.Vx = new Float32Array(this.size);
    this.Vy = new Float32Array(this.size);
    this.Vx0 = new Float32Array(this.size);
    this.Vy0 = new Float32Array(this.size);

    this.iter = 4; // Solver iterations
  }

  IX(x: number, y: number): number {
    // Clamp to boundaries
    x = Math.max(0, Math.min(x, this.N + 1));
    y = Math.max(0, Math.min(y, this.N + 1));
    return x + (this.N + 2) * y;
  }

  addDensity(x: number, y: number, amount: number) {
    const index = this.IX(x, y);
    this.density[index] += amount;
  }

  addVelocity(x: number, y: number, amountX: number, amountY: number) {
    const index = this.IX(x, y);
    this.Vx[index] += amountX;
    this.Vy[index] += amountY;
  }

  clear() {
    this.density.fill(0);
    this.s.fill(0);
    this.Vx.fill(0);
    this.Vy.fill(0);
    this.Vx0.fill(0);
    this.Vy0.fill(0);
  }

  set_bnd(b: number, x: Float32Array) {
    const N = this.N;
    for (let i = 1; i <= N; i++) {
      x[this.IX(0, i)] = b === 1 ? -x[this.IX(1, i)] : x[this.IX(1, i)];
      x[this.IX(N + 1, i)] = b === 1 ? -x[this.IX(N, i)] : x[this.IX(N, i)];
      x[this.IX(i, 0)] = b === 2 ? -x[this.IX(i, 1)] : x[this.IX(i, 1)];
      x[this.IX(i, N + 1)] = b === 2 ? -x[this.IX(i, N)] : x[this.IX(i, N)];
    }

    x[this.IX(0, 0)] = 0.5 * (x[this.IX(1, 0)] + x[this.IX(0, 1)]);
    x[this.IX(0, N + 1)] = 0.5 * (x[this.IX(1, N + 1)] + x[this.IX(0, N)]);
    x[this.IX(N + 1, 0)] = 0.5 * (x[this.IX(N, 0)] + x[this.IX(N + 1, 1)]);
    x[this.IX(N + 1, N + 1)] = 0.5 * (x[this.IX(N, N + 1)] + x[this.IX(N + 1, N)]);
  }

  lin_solve(b: number, x: Float32Array, x0: Float32Array, a: number, c: number) {
    const cRecip = 1.0 / c;
    for (let k = 0; k < this.iter; k++) {
      for (let j = 1; j <= this.N; j++) {
        for (let i = 1; i <= this.N; i++) {
          x[this.IX(i, j)] =
            (x0[this.IX(i, j)] +
              a *
                (x[this.IX(i + 1, j)] +
                  x[this.IX(i - 1, j)] +
                  x[this.IX(i, j + 1)] +
                  x[this.IX(i, j - 1)])) *
            cRecip;
        }
      }
      this.set_bnd(b, x);
    }
  }

  diffuse(b: number, x: Float32Array, x0: Float32Array, diff: number, dt: number) {
    const a = dt * diff * (this.N * this.N);
    this.lin_solve(b, x, x0, a, 1 + 4 * a);
  }

  advect(b: number, d: Float32Array, d0: Float32Array, u: Float32Array, v: Float32Array, dt: number) {
    let i0, j0, i1, j1;
    let x, y, s0, t0, s1, t1;
    let dt0 = dt * this.N;

    for (let j = 1; j <= this.N; j++) {
      for (let i = 1; i <= this.N; i++) {
        x = i - dt0 * u[this.IX(i, j)];
        y = j - dt0 * v[this.IX(i, j)];

        if (x < 0.5) x = 0.5;
        if (x > this.N + 0.5) x = this.N + 0.5;
        i0 = Math.floor(x);
        i1 = i0 + 1;

        if (y < 0.5) y = 0.5;
        if (y > this.N + 0.5) y = this.N + 0.5;
        j0 = Math.floor(y);
        j1 = j0 + 1;

        s1 = x - i0;
        s0 = 1.0 - s1;
        t1 = y - j0;
        t0 = 1.0 - t1;

        d[this.IX(i, j)] =
          s0 * (t0 * d0[this.IX(i0, j0)] + t1 * d0[this.IX(i0, j1)]) +
          s1 * (t0 * d0[this.IX(i1, j0)] + t1 * d0[this.IX(i1, j1)]);
      }
    }
    this.set_bnd(b, d);
  }

  project(u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array) {
    const h = 1.0 / this.N;
    for (let j = 1; j <= this.N; j++) {
      for (let i = 1; i <= this.N; i++) {
        div[this.IX(i, j)] =
          -0.5 *
          h *
          (u[this.IX(i + 1, j)] - u[this.IX(i - 1, j)] + v[this.IX(i, j + 1)] - v[this.IX(i, j - 1)]);
        p[this.IX(i, j)] = 0;
      }
    }
    this.set_bnd(0, div);
    this.set_bnd(0, p);

    this.lin_solve(0, p, div, 1, 4);

    for (let j = 1; j <= this.N; j++) {
      for (let i = 1; i <= this.N; i++) {
        u[this.IX(i, j)] -= 0.5 * (p[this.IX(i + 1, j)] - p[this.IX(i - 1, j)]) / h;
        v[this.IX(i, j)] -= 0.5 * (p[this.IX(i, j + 1)] - p[this.IX(i, j - 1)]) / h;
      }
    }
    this.set_bnd(1, u);
    this.set_bnd(2, v);
  }

  step() {
    let temp;

    // Velocity step
    temp = this.Vx0; this.Vx0 = this.Vx; this.Vx = temp;
    temp = this.Vy0; this.Vy0 = this.Vy; this.Vy = temp;

    this.diffuse(1, this.Vx, this.Vx0, this.visc, this.dt);
    this.diffuse(2, this.Vy, this.Vy0, this.visc, this.dt);

    this.project(this.Vx, this.Vy, this.Vx0, this.Vy0);

    temp = this.Vx0; this.Vx0 = this.Vx; this.Vx = temp;
    temp = this.Vy0; this.Vy0 = this.Vy; this.Vy = temp;

    this.advect(1, this.Vx, this.Vx0, this.Vx0, this.Vy0, this.dt);
    this.advect(2, this.Vy, this.Vy0, this.Vx0, this.Vy0, this.dt);

    this.project(this.Vx, this.Vy, this.Vx0, this.Vy0);

    // Density step
    temp = this.s; this.s = this.density; this.density = temp;
    this.diffuse(0, this.density, this.s, this.diff, this.dt);

    temp = this.s; this.s = this.density; this.density = temp;
    this.advect(0, this.density, this.s, this.Vx, this.Vy, this.dt);
    
    // Dissipate slightly over time
    for (let i = 0; i < this.size; i++) {
        this.density[i] = Math.max(0, this.density[i] - 0.05);
    }
  }
}

// --- UTILS ---
function HSVtoRGB(h: number, s: number, v: number) {
  let r = 0, g = 0, b = 0, i, f, p, q, t;
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

// --- REACT APP COMPONENT ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fluidRef = useRef<Fluid | null>(null);
  const reqRef = useRef<number>(0);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Stats & States
  const [fps, setFps] = useState(0);
  const [viscosity, setViscosity] = useState<number>(0.0000001);
  const [diffusion, setDiffusion] = useState<number>(0.00001);
  const [timeStep, setTimeStep] = useState<number>(0.1);
  const [preset, setPreset] = useState<'free' | 'smoke' | 'vortex'>('free');
  const [showVelocity, setShowVelocity] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const N = 70; // Grid resolution N x N (internal size is N+2)

  // Initialization
  useEffect(() => {
    fluidRef.current = new Fluid(N, diffusion, viscosity, timeStep);
    offscreenCanvasRef.current = document.createElement('canvas');
    offscreenCanvasRef.current.width = N + 2;
    offscreenCanvasRef.current.height = N + 2;
    
    return () => {
      cancelAnimationFrame(reqRef.current);
    };
  }, []);

  // Update Fluid Params
  useEffect(() => {
    if (fluidRef.current) {
      fluidRef.current.visc = viscosity;
      fluidRef.current.diff = diffusion;
      fluidRef.current.dt = timeStep;
    }
  }, [viscosity, diffusion, timeStep]);

  // Main Simulation & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const offscreen = offscreenCanvasRef.current;
    const oCtx = offscreen?.getContext('2d', { willReadFrequently: true });
    if (!offscreen || !oCtx) return;

    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsTime = lastTime;

    const render = () => {
      const now = performance.now();
      frameCount++;
      if (now - lastFpsTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastFpsTime = now;
      }

      const fluid = fluidRef.current;
      if (!fluid) return;

      // Handle Presets
      if (preset === 'smoke') {
        const midX = Math.floor(N / 2);
        fluid.addDensity(midX, N - 2, 250);
        fluid.addDensity(midX - 1, N - 2, 250);
        fluid.addDensity(midX + 1, N - 2, 250);
        fluid.addVelocity(midX, N - 2, 0, -100);
      } else if (preset === 'vortex') {
        const t = now * 0.002;
        const cx = Math.floor(N / 2) + Math.sin(t) * 15;
        const cy = Math.floor(N / 2) + Math.cos(t) * 15;
        fluid.addDensity(Math.floor(cx), Math.floor(cy), 150);
        fluid.addVelocity(Math.floor(cx), Math.floor(cy), Math.cos(t) * 150, -Math.sin(t) * 150);
      }

      // Step simulation
      fluid.step();

      // Render Density
      const imgData = oCtx.createImageData(N + 2, N + 2);
      const data = imgData.data;

      for (let i = 0; i < fluid.size; i++) {
        const d = fluid.density[i];
        if (d > 0.1) {
          // Map density to vivid colors (purple -> cyan -> white)
          const h = 0.8 - Math.min(d / 1000, 0.4); 
          const s = Math.max(0, 1 - d / 2000);
          const v = Math.min(1, d / 200);
          const rgb = HSVtoRGB(h, s, v);
          data[i * 4] = rgb.r;
          data[i * 4 + 1] = rgb.g;
          data[i * 4 + 2] = rgb.b;
          data[i * 4 + 3] = 255;
        } else {
          data[i * 4] = 0;
          data[i * 4 + 1] = 0;
          data[i * 4 + 2] = 0;
          data[i * 4 + 3] = 255;
        }
      }
      oCtx.putImageData(imgData, 0, 0);

      // Scale to display canvas
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // We use image smoothing to make the low-res grid look like continuous fluid
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);

      // Render Velocity Field (Optional)
      if (showVelocity) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const scaleX = canvas.width / (N + 2);
        const scaleY = canvas.height / (N + 2);
        
        for (let j = 0; j < N +