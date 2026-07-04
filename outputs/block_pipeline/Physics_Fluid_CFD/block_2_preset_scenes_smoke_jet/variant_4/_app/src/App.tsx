import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Fluid Dynamics Engine (Jos Stam's Stable Fluids) ---
const N = 64; // Grid resolution (modest for CPU performance)
const ITER = 4; // Solver iterations
const SIZE = (N + 2) * (N + 2);

const IX = (i, j) => i + (N + 2) * j;

class FluidSolver {
  constructor() {
    this.s = new Float32Array(SIZE);
    this.density = new Float32Array(SIZE);
    
    this.Vx = new Float32Array(SIZE);
    this.Vy = new Float32Array(SIZE);
    this.Vx0 = new Float32Array(SIZE);
    this.Vy0 = new Float32Array(SIZE);
    
    this.solid = new Uint8Array(SIZE); // 1 if solid obstacle, 0 if fluid
  }

  reset() {
    this.s.fill(0);
    this.density.fill(0);
    this.Vx.fill(0);
    this.Vy.fill(0);
    this.Vx0.fill(0);
    this.Vy0.fill(0);
    this.solid.fill(0);
  }

  setObstacle(cx, cy, radius) {
    this.solid.fill(0);
    for (let i = 1; i <= N; i++) {
      for (let j = 1; j <= N; j++) {
        const dx = i - cx;
        const dy = j - cy;
        if (dx * dx + dy * dy <= radius * radius) {
          this.solid[IX(i, j)] = 1;
        }
      }
    }
  }

  addDensity(x, y, amount) {
    if (x > 0 && x <= N && y > 0 && y <= N && !this.solid[IX(x, y)]) {
      this.density[IX(x, y)] += amount;
    }
  }

  addVelocity(x, y, amountX, amountY) {
    if (x > 0 && x <= N && y > 0 && y <= N && !this.solid[IX(x, y)]) {
      this.Vx[IX(x, y)] += amountX;
      this.Vy[IX(x, y)] += amountY;
    }
  }

  step(dt, visc, diff) {
    this.diffuse(1, this.Vx0, this.Vx, visc, dt);
    this.diffuse(2, this.Vy0, this.Vy, visc, dt);
    
    this.project(this.Vx0, this.Vy0, this.Vx, this.Vy);
    
    this.advect(1, this.Vx, this.Vx0, this.Vx0, this.Vy0, dt);
    this.advect(2, this.Vy, this.Vy0, this.Vx0, this.Vy0, dt);
    
    this.project(this.Vx, this.Vy, this.Vx0, this.Vy0);
    
    this.diffuse(0, this.s, this.density, diff, dt);
    this.advect(0, this.density, this.s, this.Vx, this.Vy, dt);
  }

  set_bnd(b, x) {
    for (let i = 1; i <= N; i++) {
      x[IX(0, i)]     = b === 1 ? -x[IX(1, i)] : x[IX(1, i)];
      x[IX(N + 1, i)] = b === 1 ? -x[IX(N, i)] : x[IX(N, i)];
      x[IX(i, 0)]     = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
      x[IX(i, N + 1)] = b === 2 ? -x[IX(i, N)] : x[IX(i, N)];
    }
    x[IX(0, 0)]         = 0.5 * (x[IX(1, 0)] + x[IX(0, 1)]);
    x[IX(0, N + 1)]     = 0.5 * (x[IX(1, N + 1)] + x[IX(0, N)]);
    x[IX(N + 1, 0)]     = 0.5 * (x[IX(N, 0)] + x[IX(N + 1, 1)]);
    x[IX(N + 1, N + 1)] = 0.5 * (x[IX(N, N + 1)] + x[IX(N + 1, N)]);

    // Enforce solid boundaries
    for (let i = 1; i <= N; i++) {
      for (let j = 1; j <= N; j++) {
        if (this.solid[IX(i, j)]) {
          x[IX(i, j)] = 0;
        }
      }
    }
  }

  lin_solve(b, x, x0, a, c) {
    const cRecip = 1.0 / c;
    for (let k = 0; k < ITER; k++) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          if (this.solid[IX(i, j)]) {
            x[IX(i, j)] = 0;
            continue;
          }
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

  diffuse(b, x, x0, diff, dt) {
    const a = dt * diff * N * N;
    this.lin_solve(b, x, x0, a, 1 + 4 * a);
  }

  advect(b, d, d0, u, v, dt) {
    let i0, j0, i1, j1;
    let x, y, s0, t0, s1, t1;
    const dt0 = dt * N;

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        if (this.solid[IX(i, j)]) {
          d[IX(i, j)] = 0;
          continue;
        }
        
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

  project(u, v, p, div) {
    const h = 1.0 / N;
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        if (this.solid[IX(i, j)]) {
            div[IX(i, j)] = 0;
            p[IX(i, j)] = 0;
            continue;
        }
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
        if (this.solid[IX(i, j)]) continue;
        u[IX(i, j)] -= 0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)]) / h;
        v[IX(i, j)] -= 0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)]) / h;
      }
    }
    this.set_bnd(1, u);
    this.set_bnd(2, v);
  }
}

// --- Main React Component ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fluidRef = useRef<FluidSolver>(new FluidSolver());
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(performance.now());
  const fpsFrames = useRef<number>(0);
  const fpsTime = useRef<number>(performance.now());

  // State for UI controls
  const [config, setConfig] = useState({
    viscosity: 0.00001,
    diffusion: 0.0001,
    timestep: 0.1,
  });
  const [preset, setPreset] = useState<'free' | 'smoke' | 'vortex'>('smoke');
  const [showPressure, setShowPressure] = useState(false);
  const [fps, setFps] = useState(0);

  // Interaction state
  const isMouseDown = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Initialize and apply presets
  useEffect(() => {
    const fluid = fluidRef.current;
    fluid.reset();
    if (preset === 'vortex') {
      fluid.setObstacle(Math.floor(N / 4), Math.floor(N / 2), 4);
    } else {
      fluid.setObstacle(-10, -10, 0); // Clear obstacle
    }
  }, [preset]);

  // Main simulation loop
  const animate = useCallback(() => {
    const now = performance.now();
    let dt = (now - lastTimeRef.current) / 1000;
    if (dt > 0.1) dt = 0.1; // Cap delta time
    lastTimeRef.current = now;

    const fluid = fluidRef.current;

    // Apply preset forces
    if (preset === 'smoke') {
      // Inject at bottom center
      const cx = Math.floor(N / 2);
      const cy = N - 2;
      for (let i = -2; i <= 2; i++) {
        fluid.addDensity(cx + i, cy, Math.random() * 50 + 50);
        fluid.addVelocity(cx + i, cy, (Math.random() - 0.5) * 2.0, -15.0);
      }
    } else if (preset === 'vortex') {
      // Constant left-to-right flow and dye bands
      for (let j = 1; j <= N; j++) {
        fluid.addVelocity(2, j, 10.0, 0);
        // Create horizontal streaks of dye
        if (j % 8 > 2 && j % 8 < 6) {
          fluid.addDensity(2, j, 20);
        }
      }
    }

    // Step simulation
    fluid.step(config.timestep, config.viscosity, config.diffusion);

    // Fade density slightly over time for visual clarity
    for (let i = 0; i < SIZE; i++) {
        fluid.density[i] = Math.max(0, fluid.density[i] - 0.5);
    }

    // Render to canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const w = canvas.width;
        const h = canvas.height;
        const cellW = w / N;
        const cellH = h / N;
        
        // Background
        ctx.fillStyle = '#0f172a'; // Tailwind slate-900
        ctx.fillRect(0, 0, w, h);

        const imgData = ctx.createImageData(w, h);
        const data = imgData.data;

        for (let j = 1; j <= N; j++) {
          for (let i = 1; i <= N; i++) {
            const idx = IX(i, j);
            
            // Render Obstacle
            if (fluid.solid[idx]) {
                const pxX = Math.floor((i - 1) * cellW);
                const pxY = Math.floor((j - 1) * cellH);
                for (let y = 0; y < cellH; y++) {
                    for (let x = 0; x < cellW; x++) {
                        const pIdx = ((pxY + y) * w + (pxX + x)) * 4;
                        data[pIdx] = 255;   // R
                        data[pIdx+1] = 85;  // G
                        data[pIdx+2] = 85;  // B
                        data[pIdx+3] = 255; // Alpha
                    }
                }
                continue;
            }

            let r = 0, g = 0, b = 0;

            if (showPressure) {
              // Pressure visualization (uses Vx0 as temp storage for pressure in project step)
              // Note: Stam's project stores pressure in p, which we mapped to Vx0 in our call
              const pressure = fluid.Vx0[idx] * 500; 
              if (pressure > 0) { r = Math.min(255, pressure); }
              else { b = Math.min(255, -pressure); }
            } else {
              // Dye visualization (Vivid Cyan/Magenta mapping)
              const d = fluid.density[idx];
              if (preset === 'smoke') {
                  // Fire/Smoke colormap
                  r = Math.min(255, d * 3);
                  g = Math.min(255, d * 1.0);
                  b = Math.min(255, d * 0.2);
              } else {
                  // Synthwave colormap
                  r = Math.min(255, d * 1.5);
                  g = Math.min(255, d * 0.5);
                  b = Math.min(255, d * 2.5);
              }
            }

            // Fill pixel block for this grid cell
            const pxX = Math.floor((i - 1) * cellW);
            const pxY = Math.floor((j - 1) * cellH);
            
            if (r > 0 || g > 0 || b > 0) {
                for (let y = 0; y < cellH; y++) {
                    for (let x = 0; x < cellW; x++) {
                        const pIdx = ((pxY + y) * w + (pxX + x)) * 4;
                        data[pIdx] = r;
                        data[pIdx + 1] = g;
                        data[pIdx + 2] = b;
                        data[pIdx + 3] = 255;
                    }
                }
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }
    }

    // FPS Calculation
    fpsFrames.current++;
    if (now - fpsTime.current >= 1000) {
      setFps(fpsFrames.current);
      fpsFrames.current = 0;
      fpsTime.current = now;
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [config, preset, showPressure]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  // Mouse interaction handlers
  const handlePointerEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMouseDown.current && e.type !== 'pointerdown') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const gridX = Math.floor((x / canvas.width) * N) + 1;
    const gridY = Math.floor((y / canvas.height) * N) + 1;

    if (e.type === 'pointerdown') {
        isMouseDown.current = true;
        lastMouse.current = { x, y };
        fluidRef.current.addDensity(gridX, gridY, 200);
    } else if (e.type === 'pointermove') {
        const dx = x - lastMouse.current.x;
        const dy = y - lastMouse.current.y;
        
        // Add velocity proportional to mouse movement
        fluidRef.current.addVelocity(gridX, gridY, dx * 2, dy * 2);
        // Add density at cursor
        fluidRef.current.addDensity(gridX, gridY, 200);
        
        lastMouse.current = { x, y };
    } else if (e.type === 'pointerup' || e.type === 'pointerleave') {
        isMouseDown.current = false;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 font-sans overflow-hidden">
      
      {/* Simulation Canvas Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-6 left-8 bg-slate-900/80 px-3 py-1 rounded-full text-xs text-emerald-400 font-mono shadow border border-slate-800">
          FPS: {fps} | Grid: {N}x{N}
        </div>
        
        <div className="relative shadow-2xl shadow-cyan-900/20 rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
            <canvas
            ref={canvasRef}
            width={600}
            height={600}
            className="w-full max-w-[600px] aspect-square cursor-crosshair touch-none"
            onPointerDown={handlePointer