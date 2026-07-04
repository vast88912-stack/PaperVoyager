import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Fluid Dynamics Configuration ---
const N = 64; // Grid resolution
const ITER = 4; // Solver iterations
const SIZE = (N + 2) * (N + 2);

// --- Helper Math & Fluid Functions (Stam's Stable Fluids) ---
const IX = (x: number, y: number) => x + y * (N + 2);

const set_bnd = (b: number, x: Float32Array) => {
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
};

const lin_solve = (b: number, x: Float32Array, x0: Float32Array, a: number, c: number) => {
  for (let k = 0; k < ITER; k++) {
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        x[IX(i, j)] =
          (x0[IX(i, j)] + a * (x[IX(i - 1, j)] + x[IX(i + 1, j)] + x[IX(i, j - 1)] + x[IX(i, j + 1)])) / c;
      }
    }
    set_bnd(b, x);
  }
};

const diffuse = (b: number, x: Float32Array, x0: Float32Array, diff: number, dt: number) => {
  const a = dt * diff * N * N;
  lin_solve(b, x, x0, a, 1 + 4 * a);
};

const advect = (b: number, d: Float32Array, d0: Float32Array, u: Float32Array, v: Float32Array, dt: number) => {
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
};

const project = (u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array) => {
  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      div[IX(i, j)] =
        (-0.5 * (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)])) / N;
      p[IX(i, j)] = 0;
    }
  }
  set_bnd(0, div);
  set_bnd(0, p);
  lin_solve(0, p, div, 1, 4);
  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      u[IX(i, j)] -= 0.5 * N * (p[IX(i + 1, j)] - p[IX(i - 1, j)]);
      v[IX(i, j)] -= 0.5 * N * (p[IX(i + 1, j)] - p[IX(i - 1, j)]);
    }
  }
  set_bnd(1, u);
  set_bnd(2, v);
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);

  // UI State
  const [viscosity, setViscosity] = useState<number>(0.0001);
  const [diffusion, setDiffusion] = useState<number>(0.0001);
  const [dt, setDt] = useState<number>(0.1);
  const [showPressure, setShowPressure] = useState<boolean>(false);
  const [preset, setPreset] = useState<'free' | 'smoke' | 'vortex'>('smoke');

  // Fluid State refs (avoids re-rendering UI on every frame)
  const fluidRef = useRef({
    u: new Float32Array(SIZE),
    v: new Float32Array(SIZE),
    u_prev: new Float32Array(SIZE),
    v_prev: new Float32Array(SIZE),
    dens: new Float32Array(SIZE),
    dens_prev: new Float32Array(SIZE),
    pressure: new Float32Array(SIZE),
    divergence: new Float32Array(SIZE),
  });

  const mouseRef = useRef({
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    isDown: false,
  });

  const resetFluid = useCallback () => {
    const f = fluidRef.current;
    f.u.fill(0);
    f.v.fill(0);
    f.u_prev.fill(0);
    f.v_prev.fill(0);
    f.dens.fill(0);
    f.dens_prev.fill(0);
    f.pressure.fill(0);
    f.divergence.fill(0);
  }, []);

  useEffect(() => {
    resetFluid();
  }, [preset, resetFluid]);

  // Main Simulation & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Offscreen canvas for fast pixel manipulation
    const offscreen = document.createElement('canvas');
    offscreen.width = N + 2;
    offscreen.height = N + 2;
    const offCtx = offscreen.getContext('2d')!;
    const imgData = offCtx.createImageData(N + 2, N + 2);

    let animationFrameId: number;
    let lastTime = performance.now();
    let frames = 0;

    const step = () => {
      const f = fluidRef.current;

      // Swap pointers
      let temp = f.u_prev; f.u_prev = f.u; f.u = temp;
      temp = f.v_prev; f.v_prev = f.v; f.v = temp;
      temp = f.dens_prev; f.dens_prev = f.dens; f.dens = temp;

      // Handle Presets
      if (preset === 'smoke') {
        const cx = Math.floor(N / 2);
        const cy = N;
        f.dens_prev[IX(cx, cy)] = 150;
        f.v_prev[IX(cx, cy)] = -15;
        f.dens_prev[IX(cx - 1, cy)] = 150;
        f.v_prev[IX(cx - 1, cy)] = -15;
        f.dens_prev[IX(cx + 1, cy)] = 150;
        f.v_prev[IX(cx + 1, cy)] = -15;
      } else if (preset === 'vortex') {
        // Continuous flow from left
        for (let j = 1; j <= N; j++) {
          f.u_prev[IX(2, j)] = 3;
          if (j > N / 2 - 4 && j < N / 2 + 4) {
            f.dens_prev[IX(2, j)] = 100;
          }
        }
        // Obstacle (cylinder)
        const cx = Math.floor(N / 4);
        const cy = Math.floor(N / 2);
        for (let i = cx - 3; i <= cx + 3; i++) {
          for (let j = cy - 3; j <= cy + 3; j++) {
            if ((i - cx) ** 2 + (j - cy) ** 2 <= 9) {
              f.u[IX(i, j)] = 0;
              f.v[IX(i, j)] = 0;
              f.u_prev[IX(i, j)] = 0;
              f.v_prev[IX(i, j)] = 0;
              f.dens[IX(i, j)] = 0;
              f.dens_prev[IX(i, j)] = 0;
            }
          }
        }
      }

      // Add Mouse Forces
      const mouse = mouseRef.current;
      if (mouse.isDown) {
        const i = Math.max(1, Math.min(N, Math.floor((mouse.x / canvas.width) * N)));
        const j = Math.max(1, Math.min(N, Math.floor((mouse.y / canvas.height) * N)));
        const du = (mouse.x - mouse.px) * 0.5;
        const dv = (mouse.y - mouse.py) * 0.5;

        f.dens_prev[IX(i, j)] = 250;
        f.u_prev[IX(i, j)] = du;
        f.v_prev[IX(i, j)] = dv;
        
        // spread it a bit
        f.dens_prev[IX(i+1, j)] = 250;
        f.dens_prev[IX(i, j+1)] = 250;
      }
      mouse.px = mouse.x;
      mouse.py = mouse.y;

      // Velocity Step
      diffuse(1, f.u, f.u_prev, viscosity, dt);
      diffuse(2, f.v, f.v_prev, viscosity, dt);
      project(f.u, f.v, f.pressure, f.divergence);
      
      temp = f.u_prev; f.u_prev = f.u; f.u = temp;
      temp = f.v_prev; f.v_prev = f.v; f.v = temp;
      
      advect(1, f.u, f.u_prev, f.u_prev, f.v_prev, dt);
      advect(2, f.v, f.v_prev, f.u_prev, f.v_prev, dt);
      project(f.u, f.v, f.pressure, f.divergence);

      // Density Step
      diffuse(0, f.dens, f.dens_prev, diffusion, dt);
      temp = f.dens_prev; f.dens_prev = f.dens; f.dens = temp;
      advect(0, f.dens, f.dens_prev, f.u, f.v, dt);

      // Fade density slightly over time
      for (let i = 0; i < SIZE; i++) {
        f.dens[i] *= 0.995;
      }

      // Render to ImageData
      const data = imgData.data;
      for (let j = 0; j <= N + 1; j++) {
        for (let i = 0; i <= N + 1; i++) {
          const idx = IX(i, j);
          const pxIdx = (j * (N + 2) + i) * 4;
          
          let d = f.dens[idx];
          if (d > 255) d = 255;

          if (showPressure) {
            // Pressure Visualization Mode
            const p = f.pressure[idx] * 5000; // Scale for visibility
            data[pxIdx]     = p > 0 ? p : 0;         // Red for positive pressure
            data[pxIdx + 1] = d * 0.3;               // Slight green for dye structure
            data[pxIdx + 2] = p < 0 ? -p : 0;        // Blue for negative pressure
            data[pxIdx + 3] = 255;
          } else {
            // Standard Dye Mode
            data[pxIdx]     = d * 0.1;               // Red
            data[pxIdx + 1] = d * 0.5;               // Green
            data[pxIdx + 2] = d;                     // Blue (Vibrant Cyan/Blue dye)
            data[pxIdx + 3] = 255;
          }
        }
      }

      // Draw obstacle overlay if vortex
      if (preset === 'vortex') {
        const cx = Math.floor(N / 4);
        const cy = Math.floor(N / 2);
        for (let i = cx - 3; i <= cx + 3; i++) {
          for (let j = cy - 3; j <= cy + 3; j++) {
            if ((i - cx) ** 2 + (j - cy) ** 2 <= 9) {
              const pxIdx = (j * (N + 2) + i) * 4;
              data[pxIdx] = 100;
              data[pxIdx + 1] = 100;
              data[pxIdx + 2] = 100;
              data[pxIdx + 3] = 255;
            }
          }
        }
      }

      offCtx.putImageData(imgData, 0, 0);

      // Scale up to main canvas
      ctx.imageSmoothingEnabled = true;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);

      // Reset input buffers
      f.u_prev.fill(0);
      f.v_prev.fill(0);
      f.dens_prev.fill(0);

      // FPS Calculation
      frames++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        if (fpsRef.current) {
          fpsRef.current.innerText = `${frames} FPS`;
        }
        frames = 0;
        lastTime = now;
      }

      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrameId);
  }, [diffusion, dt, preset, showPressure, viscosity]);

  // Mouse event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
    mouseRef.current.px = mouseRef.current.x;
    mouseRef.current.py = mouseRef.current.y;
    mouseRef.current.isDown = true;
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
    <div className="flex flex-col md:flex-row min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-cyan-900">
      
      {/* Sidebar Controls */}
      <div className="w-full md:w-80 bg-neutral-900 border-b md:border-b-0 md:border-r border-neutral-800 p-6 flex flex-col gap-8 z-10 shadow-xl">
        
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wide">
            Fluid Sandbox
          </h1>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">
            Stable Fluids Algorithm
          </p>
        </div>

        {/* Highlight Feature: Toggle Pressure Map */}
        <div className="bg-neutral-800/50 rounded-