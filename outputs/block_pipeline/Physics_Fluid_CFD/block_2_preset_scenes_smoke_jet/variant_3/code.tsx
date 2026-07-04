import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * 2D Stable Fluids Implementation
 * Based on Jos Stam's "Real-Time Fluid Dynamics for Games"
 */

const N = 80; // Grid resolution
const ITER = 10; // Solver iterations
const SIZE = (N + 2) * (N + 2);

function IX(x: number, y: number) {
  // Clamp to prevent out of bounds
  const cx = Math.max(0, Math.min(x, N + 1));
  const cy = Math.max(0, Math.min(y, N + 1));
  return cx + (N + 2) * cy;
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
  obstacle: { x: number; y: number; r: number } | null;

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
    this.obstacle = null;
  }

  addDensity(x: number, y: number, amount: number) {
    this.density[IX(x, y)] += amount;
  }

  addVelocity(x: number, y: number, amountX: number, amountY: number) {
    const index = IX(x, y);
    this.Vx[index] += amountX;
    this.Vy[index] += amountY;
  }

  setObstacle(x: number, y: number, r: number) {
    this.obstacle = { x, y, r };
  }

  clearObstacle() {
    this.obstacle = null;
  }

  applyObstacle() {
    if (!this.obstacle) return;
    const { x: ox, y: oy, r } = this.obstacle;
    const r2 = r * r;
    for (let j = 0; j <= N + 1; j++) {
      for (let i = 0; i <= N + 1; i++) {
        const dx = i - ox;
        const dy = j - oy;
        if (dx * dx + dy * dy <= r2) {
          const idx = IX(i, j);
          this.Vx[idx] = 0;
          this.Vy[idx] = 0;
          this.density[idx] = 0;
        }
      }
    }
  }

  step() {
    const { Vx, Vy, Vx0, Vy0, density, s, dt, diff, visc } = this;

    this.diffuse(1, Vx0, Vx, visc, dt);
    this.diffuse(2, Vy0, Vy, visc, dt);

    this.project(Vx0, Vy0, Vx, Vy);

    this.advect(1, Vx, Vx0, Vx0, Vy0, dt);
    this.advect(2, Vy, Vy0, Vx0, Vy0, dt);

    this.project(Vx, Vy, Vx0, Vy0);

    this.diffuse(0, s, density, diff, dt);
    this.advect(0, density, s, Vx, Vy, dt);

    this.applyObstacle();
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
        div[IX(i, j)] =
          -0.5 *
          h *
          (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)]);
        p[IX(i, j)] = 0;
      }
    }
    this.set_bnd(0, div);
    this.set_bnd(0, p);

    this.lin_solve(0, p, div, 1, 4);

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        u[IX(i, j)] -= 0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)]) / h;
        v[IX(i, j)] -= 0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)]) / h;
      }
    }
    this.set_bnd(1, u);
    this.set_bnd(2, v);
    
    // Store pressure for visualization
    for (let i = 0; i < SIZE; i++) {
        this.p[i] = p[i];
    }
  }
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [r * 255, g * 255, b * 255];
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fluidRef = useRef<Fluid | null>(null);
  const reqRef = useRef<number>();
  
  const [fps, setFps] = useState(0);
  const [viscosity, setViscosity] = useState<number>(0.0);
  const [diffusion, setDiffusion] = useState<number>(0.0);
  const [timeStep, setTimeStep] = useState<number>(0.1);
  const [preset, setPreset] = useState<'custom' | 'smoke_jet' | 'vortex_street'>('smoke_jet');
  const [showPressure, setShowPressure] = useState<boolean>(false);
  
  const mouse = useRef({ x: 0, y: 0, down: false, px: 0, py: 0 });

  // Initialize Fluid
  useEffect(() => {
    fluidRef.current = new Fluid(timeStep, diffusion, viscosity);
  }, []);

  // Sync settings
  useEffect(() => {
    if (fluidRef.current) {
      fluidRef.current.visc = viscosity;
      fluidRef.current.diff = diffusion;
      fluidRef.current.dt = timeStep;
    }
  }, [viscosity, diffusion, timeStep]);

  const resetFluid = useCallback(() => {
    if (!fluidRef.current) return;
    fluidRef.current.density.fill(0);
    fluidRef.current.Vx.fill(0);
    fluidRef.current.Vy.fill(0);
    fluidRef.current.Vx0.fill(0);
    fluidRef.current.Vy0.fill(0);
    fluidRef.current.p.fill(0);
    fluidRef.current.clearObstacle();
  }, []);

  useEffect(() => {
    resetFluid();
  }, [preset, resetFluid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fluidRef.current) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // We use an offscreen canvas/imageData matching grid size for speed, then scale up
    const imgData = ctx.createImageData(N + 2, N + 2);
    const offCanvas = document.createElement('canvas');
    offCanvas.width = N + 2;
    offCanvas.height = N + 2;
    const offCtx = offCanvas.getContext('2d');

    let frames = 0;
    let lastTime = performance.now();
    let tick = 0;

    const render = () => {
      const fluid = fluidRef.current;
      if (!fluid || !offCtx) return;

      tick += 1;

      // --- Apply Presets Logic ---
      if (preset === 'smoke_jet') {
        fluid.clearObstacle();
        const cx = Math.floor(N / 2);
        const cy = N - 2;
        // Inject density and upward velocity
        for(let i = -2; i <= 2; i++) {
           fluid.addDensity(cx + i, cy, 150);
           fluid.addDensity(cx + i, cy - 1, 150);
        }
        // slight wobble
        const wobble = Math.sin(tick * 0.1) * 2;
        fluid.addVelocity(cx, cy, wobble, -15);
      } 
      else if (preset === 'vortex_street') {
        const obsX = Math.floor(N / 3);
        const obsY = Math.floor(N / 2);
        const obsR = 6;
        fluid.setObstacle(obsX, obsY, obsR);

        // Constant inflow from the left
        for (let j = 1; j <= N; j++) {
          fluid.addDensity(2, j, 80);
          fluid.addVelocity(2, j, 5, 0); // push right
        }
        // Small initial perturbation to break symmetry quickly
        if (tick < 10) {
           fluid.addVelocity(obsX, obsY + obsR + 2, 0, 5);
        }
      } else {
        fluid.clearObstacle();
      }

      // --- Apply Mouse Interaction ---
      if (mouse.current.down) {
        const gridX = Math.max(1, Math.min(N, Math.floor((mouse.current.x / canvas.clientWidth) * N)));
        const gridY = Math.max(1, Math.min(N, Math.floor((mouse.current.y / canvas.clientHeight) * N)));
        const dx = mouse.current.x - mouse.current.px;
        const dy = mouse.current.y - mouse.current.py;
        
        for(let i = -1; i <= 1; i++){
          for(let j = -1; j <= 1; j++){
            fluid.addDensity(gridX+i, gridY+j, 200);
            fluid.addVelocity(gridX+i, gridY+j, dx * 0.5, dy * 0.5);
          }
        }
      }
      mouse.current.px = mouse.current.x;
      mouse.current.py = mouse.current.y;

      // --- Simulate Step ---
      fluid.step();

      // --- Rendering ---
      const data = imgData.data;
      for (let j = 0; j <= N + 1; j++) {
        for (let i = 0; i <= N + 1; i++) {
          const idx = IX(i, j);
          const pxIdx = (j * (N + 2) + i) * 4;

          // Render obstacle
          if (fluid.obstacle) {
             const dx = i - fluid.obstacle.x;
             const dy = j - fluid.obstacle.y;
             if (dx*dx + dy*dy <=