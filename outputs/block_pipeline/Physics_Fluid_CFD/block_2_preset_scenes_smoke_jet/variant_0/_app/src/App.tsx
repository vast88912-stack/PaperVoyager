import React, { useEffect, useRef, useState } from 'react';

// --- Fluid Dynamics Solver (Jos Stam's Stable Fluids) ---
const N = 64;
const iter = 4;
const SIZE = (N + 2) * (N + 2);

function IX(x: number, y: number) {
  return x + (N + 2) * y;
}

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

  // Store pressure for visualization
  p: Float32Array;

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
    
    this.p = new Float32Array(SIZE);
  }

  addDensity(x: number, y: number, amount: number) {
    this.density[IX(x, y)] += amount;
  }

  addVelocity(x: number, y: number, amountX: number, amountY: number) {
    this.Vx[IX(x, y)] += amountX;
    this.Vy[IX(x, y)] += amountY;
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

  diffuse(b: number, x: Float32Array, x0: Float32Array, diff: number, dt: number) {
    const a = dt * diff * (N - 2) * (N - 2);
    this.lin_solve(b, x, x0, a, 1 + 6 * a);
  }

  lin_solve(b: number, x: Float32Array, x0: Float32Array, a: number, c: number) {
    const cRecip = 1.0 / c;
    for (let k = 0; k < iter; k++) {
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
      this.set_bnd(b, x);
    }
  }

  project(velocX: Float32Array, velocY: Float32Array, p: Float32Array, div: Float32Array) {
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        div[IX(i, j)] =
          (-0.5 *
            (velocX[IX(i + 1, j)] -
              velocX[IX(i - 1, j)] +
              velocY[IX(i, j + 1)] -
              velocY[IX(i, j - 1)])) /
          N;
        p[IX(i, j)] = 0;
      }
    }

    this.set_bnd(0, div);
    this.set_bnd(0, p);
    this.lin_solve(0, p, div, 1, 4);

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        velocX[IX(i, j)] -= 0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)]) * N;
        velocY[IX(i, j)] -= 0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)]) * N;
      }
    }

    this.set_bnd(1, velocX);
    this.set_bnd(2, velocY);
    
    // Save pressure for visualization
    for(let i=0; i<SIZE; i++) this.p[i] = p[i];
  }

  advect(b: number, d: Float32Array, d0: Float32Array, velocX: Float32Array, velocY: Float32Array, dt: number) {
    let i0, j0, i1, j1;
    let x, y, s0, t0, s1, t1;
    let dt0 = dt * N;

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        x = i - dt0 * velocX[IX(i, j)];
        y = j - dt0 * velocY[IX(i, j)];

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
}

// --- Main React Component ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const fluidRef = useRef<Fluid | null>(null);
  const requestRef = useRef<number>();
  
  const [fps, setFps] = useState(0);
  const [viscosity, setViscosity] = useState(0.0000001);
  const [diffusion, setDiffusion] = useState(0.00001);
  const [timestep, setTimestep] = useState(0.1);
  const [showPressure, setShowPressure] = useState(false);
  const [mode, setMode] = useState<'interactive' | 'smoke' | 'vortex'>('interactive');

  // Mouse interaction state
  const isMouseDown = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Initialize fluid and offscreen canvas
  useEffect(() => {
    fluidRef.current = new Fluid(timestep, diffusion, viscosity);
    offscreenCanvasRef.current.width = N;
    offscreenCanvasRef.current.height = N;
  }, []);

  // Update fluid parameters when sliders change
  useEffect(() => {
    if (fluidRef.current) {
      fluidRef.current.dt = timestep;
      fluidRef.current.diff = diffusion;
      fluidRef.current.visc = viscosity;
    }
  }, [timestep, diffusion, viscosity]);

  // Main animation loop
  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;
    let lastFpsTime = lastTime;

    const render = (time: number) => {
      if (!fluidRef.current || !canvasRef.current) return;
      const fluid = fluidRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const offCtx = offscreenCanvasRef.current.getContext('2d');
      if (!ctx || !offCtx) return;

      // Handle Presets
      if (mode === 'smoke') {
        const cx = Math.floor(N / 2);
        const cy = N - 2;
        for (let i = -2; i <= 2; i++) {
          fluid.addDensity(cx + i, cy, 200);
          fluid.addVelocity(cx + i, cy, (Math.random() - 0.5) * 10, -150);
        }
      } else if (mode === 'vortex') {
        // Continuous flow from left
        for (let i = 1; i <= N; i++) {
          fluid.addDensity(2, i, 150);
          // Add slight perturbation to trigger vortex shedding
          const perturbation = Math.sin(time * 0.005 + i * 0.5) * 15;
          fluid.addVelocity(2, i, 100 + perturbation, 0);
        }
        // Obstacle in the middle
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

      // Step simulation
      fluid.step();

      // Render to offscreen canvas
      const imgData = offCtx.createImageData(N, N);
      const data = imgData.data;

      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const idx = IX(i + 1, j + 1);
          const pixelIdx = (i + j * N) * 4;

          if (showPressure) {
            // Render Pressure (Red = positive, Blue = negative)
            const p = fluid.p[idx] * 5000; 
            data[pixelIdx] = p > 0 ? p : 0;       // R
            data[pixelIdx + 1] = 0;               // G
            data[pixelIdx + 2] = p < 0 ? -p : 0;  // B
            data[pixelIdx + 3] = 255;             // A
          } else {
            // Render Dye (Vivid Cyan/Purple)
            const d = fluid.density[idx];
            // Fade density slightly over time for visual effect
            fluid.density[idx] *= 0.995; 

            data[pixelIdx] = Math.min(255, d * 0.2);     // R
            data[pixelIdx + 1] = Math.min(255, d * 0.8); // G
            data[pixelIdx + 2] = Math.min(255, d * 1.5); // B
            data[pixelIdx + 3] = 255;                    // A
          }

          // Draw obstacle for vortex street
          if (mode === 'vortex') {
            const ox = Math.floor(N / 4);
            const oy = Math.floor(N / 2);
            const r = 4;
            if ((i - ox) * (i - ox) + (j - oy) * (j - oy) <= r * r) {
              data[pixelIdx] = 100;
              data[pixelIdx + 1] = 100;
              data[pixelIdx + 2] = 100;
              data[pixelIdx + 3] = 255;
            }
          }
        }
      }

      offCtx.putImageData(imgData, 0, 0);

      // Draw scaled to main canvas
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(offscreenCanvasRef.current, 0, 0, canvas.width, canvas.height);

      // FPS Calculation
      frames++;
      if (time - lastFpsTime >= 1000) {
        setFps(frames);
        frames = 0;
        lastFpsTime = time;
      }

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [mode, showPressure]);

  // Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isMouseDown.current = true;
    const rect = canvasRef.current!.getBoundingClientRect();
    lastMouse.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMouseDown.current || !fluidRef.current || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const gridX = Math.floor((x / canvasRef.current.width) * N) + 1;
    const gridY = Math.floor((y / canvasRef.current.height) * N) + 1;

    const dx = x - lastMouse.current.x;
    const dy = y - lastMouse.current.y;

    if (gridX >= 1 && gridX <= N && gridY >= 1 && gridY <= N) {
      fluidRef.current.addDensity(gridX, gridY, 500);
      fluidRef.current.addVelocity(gridX, gridY, dx * 5, dy * 5);
    }

    lastMouse.current = { x, y };
  };

  const handlePointerUp = () => {
    isMouseDown.current = false;
  };

  const resetSimulation = () => {
    if (fluidRef.current) {
      fluidRef.current.density.fill(0);
      fluidRef.current.Vx.fill(0);
      fluidRef.current.Vy.fill(0);
      fluidRef.current.Vx0.fill(0);
      fluidRef.current.Vy0.fill(0);
      fluidRef.current.p.fill(0);
    }
  };

  return (
    <div className="flex h-screen w-full bg-neutral-950 text-neutral-200 font-sans overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-80 bg-neutral-900