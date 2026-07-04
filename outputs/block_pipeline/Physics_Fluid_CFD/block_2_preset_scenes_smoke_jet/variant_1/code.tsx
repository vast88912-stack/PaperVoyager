import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Fluid Dynamics Implementation (Jos Stam's Stable Fluids) ---
// Grid size (N x N). Actual arrays are (N+2) x (N+2) to accommodate boundaries.
const N = 80;
const ITER = 4;
const SIZE = (N + 2) * (N + 2);

function IX(x: number, y: number) {
  // Clamp to prevent out of bounds
  x = Math.max(0, Math.min(x, N + 1));
  y = Math.max(0, Math.min(y, N + 1));
  return x + (N + 2) * y;
}

class FluidSolver {
  public dt: number = 0.1;
  public diff: number = 0.0;
  public visc: number = 0.0;

  public s: Float32Array = new Float32Array(SIZE);
  public density: Float32Array = new Float32Array(SIZE);

  public Vx: Float32Array = new Float32Array(SIZE);
  public Vy: Float32Array = new Float32Array(SIZE);
  public Vx0: Float32Array = new Float32Array(SIZE);
  public Vy0: Float32Array = new Float32Array(SIZE);

  // Expose pressure for visualization
  public pressure: Float32Array = new Float32Array(SIZE);

  // Obstacle state
  public hasObstacle: boolean = false;
  public obsX: number = Math.floor(N / 4);
  public obsY: number = Math.floor(N / 2);
  public obsR: number = 6;

  constructor() {
    this.reset();
  }

  reset() {
    this.s.fill(0);
    this.density.fill(0);
    this.Vx.fill(0);
    this.Vy.fill(0);
    this.Vx0.fill(0);
    this.Vy0.fill(0);
    this.pressure.fill(0);
  }

  addDensity(x: number, y: number, amount: number) {
    this.density[IX(x, y)] += amount;
  }

  addVelocity(x: number, y: number, amountX: number, amountY: number) {
    this.Vx[IX(x, y)] += amountX;
    this.Vy[IX(x, y)] += amountY;
  }

  step() {
    const { visc, diff, dt, Vx, Vy, Vx0, Vy0, s, density } = this;

    this.velStep(Vx, Vy, Vx0, Vy0, visc, dt);
    this.densStep(density, s, Vx, Vy, diff, dt);
    this.applyObstacle();
  }

  applyObstacle() {
    if (!this.hasObstacle) return;
    for (let i = 1; i <= N; i++) {
      for (let j = 1; j <= N; j++) {
        const dx = i - this.obsX;
        const dy = j - this.obsY;
        if (dx * dx + dy * dy <= this.obsR * this.obsR) {
          this.Vx[IX(i, j)] = 0;
          this.Vy[IX(i, j)] = 0;
          this.density[IX(i, j)] = 0;
        }
      }
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
  }

  linSolve(b: number, x: Float32Array, x0: Float32Array, a: number, c: number) {
    const invC = 1.0 / c;
    for (let k = 0; k < ITER; k++) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          x[IX(i, j)] =
            (x0[IX(i, j)] +
              a *
                (x[IX(i - 1, j)] +
                  x[IX(i + 1, j)] +
                  x[IX(i, j - 1)] +
                  x[IX(i, j + 1)])) *
            invC;
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
    this.setBnd(b, d);
  }

  project(u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array) {
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
    this.setBnd(0, div);
    this.setBnd(0, p);

    this.linSolve(0, p, div, 1, 4);

    // Store pressure for visualization
    for (let i = 0; i < SIZE; i++) {
      this.pressure[i] = p[i];
    }

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        u[IX(i, j)] -= 0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)]) / h;
        v[IX(i, j)] -= 0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)]) / h;
      }
    }
    this.setBnd(1, u);
    this.setBnd(2, v);
  }

  velStep(u: Float32Array, v: Float32Array, u0: Float32Array, v0: Float32Array, visc: number, dt: number) {
    // Diffuse
    if (visc > 0) {
      this.diffuse(1, u0, u, visc, dt);
      this.diffuse(2, v0, v, visc, dt);
    } else {
      u0.set(u);
      v0.set(v);
    }

    this.project(u0, v0, u, v);

    // Advect
    this.advect(1, u, u0, u0, v0, dt);
    this.advect(2, v, v0, u0, v0, dt);

    this.project(u, v, u0, v0);
  }

  densStep(x: Float32Array, x0: Float32Array, u: Float32Array, v: Float32Array, diff: number, dt: number) {
    if (diff > 0) {
      this.diffuse(0, x0, x, diff, dt);
    } else {
      x0.set(x);
    }
    this.advect(0, x, x0, u, v, dt);
  }
}

// --- React Component ---

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fluidRef = useRef<FluidSolver | null>(null);
  const reqRef = useRef<number>();

  const [fps, setFps] = useState(0);
  const [viscosity, setViscosity] = useState(0.0);
  const [diffusion, setDiffusion] = useState(0.0);
  const [timestep, setTimestep] = useState(0.1);
  const [showPressure, setShowPressure] = useState(false);
  const [preset, setPreset] = useState<'none' | 'smoke_jet' | 'vortex_street'>('smoke_jet');

  // Mouse interaction state
  const isMouseDown = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!fluidRef.current) {
      fluidRef.current = new FluidSolver();
    }
    const fluid = fluidRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const imgData = ctx.createImageData(N, N);

    let lastTime = performance.now();
    let frames = 0;
    let fpsTimer = 0;

    const render = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      // FPS Calculation
      frames++;
      fpsTimer += delta;
      if (fpsTimer >= 1000) {
        setFps(frames);
        frames = 0;
        fpsTimer = 0;
      }

      // Update fluid parameters
      fluid.visc = viscosity;
      fluid.diff = diffusion;
      fluid.dt = timestep;

      // Apply Presets
      if (preset === 'smoke_jet') {
        fluid.hasObstacle = false;
        // Inject at bottom center
        const cx = Math.floor(N / 2);
        const cy = N - 2;
        for (let i = -2; i <= 2; i++) {
          fluid.addDensity(cx + i, cy, 150);
          fluid.addVelocity(cx + i, cy, (Math.random() - 0.5) * 5, -50);
        }
      } else if (preset === 'vortex_street') {
        fluid.hasObstacle = true;
        // Constant flow from left
        for (let j = 1; j <= N; j++) {
          fluid.addVelocity(2, j, 30, 0);
          // Add stripes of density for visualization
          if (j % 8 < 4) {
            fluid.addDensity(2, j, 50);
          }
        }
      } else {
        fluid.hasObstacle = false;
      }

      // Decay density slightly for visual effect
      for (let i = 0; i < SIZE; i++) {
        fluid.density[i] *= 0.995;
      }

      // Step simulation
      fluid.step();

      // Render to ImageData
      const data = imgData.data;
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const idx = IX(i + 1, j + 1);
          const px = (i + j * N) * 4;

          // Draw Obstacle
          if (fluid.hasObstacle) {
            const dx = i + 1 - fluid.obsX;
            const dy = j + 1 - fluid.obsY;
            if (dx * dx + dy * dy <= fluid.obsR * fluid.obsR) {
              data[px] = 100;
              data[px + 1] = 100;
              data[px + 2] = 100;
              data[px + 3] = 25