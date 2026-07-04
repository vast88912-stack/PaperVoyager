import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Fluid Simulation Core (Jos Stam's Stable Fluids) ---
const N = 70; // Grid resolution (N x N)
const ITER = 10; // Solver iterations
const SIZE = (N + 2) * (N + 2);

const IX = (i: number, j: number) => i + (N + 2) * j;

class Fluid {
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

  pressure: Float32Array;
  divergence: Float32Array;

  constructor(dt: number, diffusion: number, viscosity: number) {
    this.size = SIZE;
    this.dt = dt;
    this.diff = diffusion;
    this.visc = viscosity;

    this.s = new Float32Array(SIZE);
    this.density = new Float32Array(SIZE);
    this.Vx = new Float32Array(SIZE);
    this.Vy = new Float32Array(SIZE);
    this.Vx0 = new Float32Array(SIZE);
    this.Vy0 = new Float32Array(SIZE);
    this.pressure = new Float32Array(SIZE);
    this.divergence = new Float32Array(SIZE);
  }

  reset() {
    this.density.fill(0);
    this.Vx.fill(0);
    this.Vy.fill(0);
    this.Vx0.fill(0);
    this.Vy0.fill(0);
    this.pressure.fill(0);
    this.divergence.fill(0);
    this.s.fill(0);
  }

  addDensity(x: number, y: number, amount: number) {
    const index = IX(x, y);
    this.density[index] += amount;
  }

  addVelocity(x: number, y: number, amountX: number, amountY: number) {
    const index = IX(x, y);
    this.Vx[index] += amountX;
    this.Vy[index] += amountY;
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
    this.lin_solve(b, x, x0, a, 1 + 4 * a);
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

  project(u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array) {
    const h = 1.0 / N;
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        div[IX(i, j)] =
          -0.5 * h * (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)]);
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
      this.pressure[i] = p[i];
    }
  }
}

// --- React Component ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fluidRef = useRef<Fluid>(new Fluid(0.1, 0.0, 0.0000001));
  
  const [viscosity, setViscosity] = useState(0.0000001);
  const [diffusion, setDiffusion] = useState(0.0);
  const [timestep, setTimestep] = useState(0.1);
  const [showPressure, setShowPressure] = useState(false);
  const [preset, setPreset] = useState<'free' | 'smoke' | 'vortex'>('free');
  const [fps, setFps] = useState(0);

  const mouseRef = useRef({ x: 0, y: 0, px: 0, py: 0, isDown: false });
  const frameRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const framesCountRef = useRef(0);

  // Apply settings to fluid instance
  useEffect(() => {
    fluidRef.current.visc = viscosity;
    fluidRef.current.diff = diffusion;
    fluidRef.current.dt = timestep;
  }, [viscosity, diffusion, timestep]);

  const resetFluid = useCallback(() => {
    fluidRef.current.reset();
  }, []);

  const applyPreset = useCallback((p: 'free' | 'smoke' | 'vortex') => {
    setPreset(p);
    resetFluid();
  }, [resetFluid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // We render to an offscreen canvas of size N x N, then scale it up to the main canvas
    const offCanvas = document.createElement('canvas');
    offCanvas.width = N;
    offCanvas.height = N;
    const offCtx = offCanvas.getContext('2d')!;
    const imgData = offCtx.createImageData(N, N);

    const render = () => {
      const fluid = fluidRef.current;

      // Handle Presets
      if (preset === 'smoke') {
        const cx = Math.floor(N / 2);
        const cy = N - 2;
        for (let i = -2; i <= 2; i++) {
          fluid.addDensity(cx + i, cy, 150);
          fluid.addVelocity(cx + i, cy, (Math.random() - 0.5) * 0.5, -5);
        }
      } else if (preset === 'vortex') {
        // Continuous flow from the left
        for (let j = 1; j <= N; j++) {
          fluid.addVelocity(2, j, 3, 0);
          if (j > N / 2 - 5 && j < N / 2 + 5) {
            fluid.addDensity(2, j, 50);
          }
        }
        // Obstacle (cylinder)
        const cx = Math.floor(N / 3);
        const cy = Math.floor(N / 2);
        const r = 4;
        for (let j = cy - r; j <= cy + r; j++) {
          for (let i = cx - r; i <= cx + r; i++) {
            if ((i - cx) ** 2 + (j - cy) ** 2 <= r ** 2) {
              fluid.Vx[IX(i, j)] = 0;
              fluid.Vy[IX(i, j)] = 0;
              fluid.density[IX(i, j)] = 0;
            }
          }
        }
      }

      // Handle Mouse Input
      if (mouseRef.current.isDown) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = N / rect.width;
        const scaleY = N / rect.height;

        const gridX = Math.floor(mouseRef.current.x * scaleX);
        const gridY = Math.floor(mouseRef.current.y * scaleY);
        const pGridX = Math.floor(mouseRef.current.px * scaleX);
        const pGridY = Math.floor(mouseRef.current.py * scaleY);

        const amtX = (gridX - pGridX) * 2.0;
        const amtY = (gridY - pGridY) * 2.0;

        // Add density and velocity in a small radius
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const x = gridX + i;
            const y = gridY + j;
            if (x > 0 && x < N + 1 && y > 0 && y < N + 1) {
              fluid.addDensity(x, y, 200);
              fluid.addVelocity(x, y, amtX, amtY);
            }
          }
        }
      }

      // Step simulation
      fluid.step();

      // Render Step
      const d = fluid.density;
      const p = fluid.pressure;
      const data = imgData.data;

      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          const idx = IX(i, j);
          const pixelIdx = ((j - 1) * N + (i - 1)) * 4;

          if (showPressure) {
            // Pressure Visualization (Red = Positive, Blue = Negative)
            const pressureVal = p[idx] * 5000; // Scale for visibility
            const r = pressureVal > 0 ? Math.min(255, pressureVal) : 0;
            const b = pressureVal < 0 ? Math.min(255, -pressureVal) : 0;
            const g = Math.min(255, Math.abs(pressureVal) * 0.2); // slight white mix

            data[pixelIdx] = r;
            data[pixelIdx + 1] = g;
            data[pixelIdx + 2] = b;
            data[pixelIdx + 3] = 255;
          } else {
            // Dye Visualization (Vivid cyan/purple mix)
            const dens = Math.min(255, d[idx]);
            // Map density to a vivid color
            data[pixelIdx] = Math.min(255, dens * 0.8);     // R
            data[pixelIdx + 1] = Math.min(255, dens * 0.2); // G
            data[pixelIdx + 2] = Math.min(255, dens * 1.5); // B
            data[pixelIdx + 3] = 255;
          }

          // Draw obstacle for vortex street
          if (preset === 'vortex') {
            const cx = Math.floor(N / 3);
            const cy = Math.floor(N / 2);
            if ((i - cx) ** 2 + (j - cy) ** 2 <= 16) {
               data[pixelIdx] = 100;
               data[pixelIdx + 1] = 100;
               data[pixelIdx + 2] = 100;
               data[pixelIdx + 3] = 255;
            }
          }
        }
      }

      offCtx.putImageData(imgData, 0, 0);

      // Draw to main canvas
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(offCanvas, 0, 0, canvas.width, canvas.height);

      // Fade density slightly over time
      for (let i = 0; i < fluid.size; i++) {
        fluid.density[i] *= 0.995;
      }

      // FPS Calculation
      framesCountRef.current++;
      const now = performance.now();
      if (now - lastTimeRef.current >= 1000) {
        setFps(framesCountRef.current);
        framesCountRef.current = 0;
        lastTimeRef.current = now;
      }

      // Update previous mouse pos
      mouseRef.current.px = mouseRef.current.x;
      mouseRef.current.py = mouseRef.current.y;

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);

    return () => cancelAnimationFrame(frameRef.current);
  }, [preset, showPressure]);

  // Mouse/Touch Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    mouseRef.current.isDown = true;
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
    mouseRef.current.px = mouseRef.current.x;
    mouseRef.current.py = mouseRef.current.y;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!mouseRef.current.isDown) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
  };

  const handlePointerUp = () => {
    mouseRef.current.isDown = false;
  };

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-gray-100 font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {/* Sidebar Controls */}
      <aside className="w-80 bg-gray-900 border-r border-gray-800 flex flex