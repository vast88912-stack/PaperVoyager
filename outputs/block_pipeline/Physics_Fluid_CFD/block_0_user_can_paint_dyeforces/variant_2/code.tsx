import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Fluid Simulation Core (Jos Stam's Stable Fluids) ---
const N = 64;
const ITER = 4;
const SIZE = (N + 2) * (N + 2);

function IX(x: number, y: number): number {
  return Math.max(0, Math.min(N + 1, x)) + (N + 2) * Math.max(0, Math.min(N + 1, y));
}

class Fluid {
  dt: number;
  diff: number;
  visc: number;
  
  s: Float32Array;
  densityR: Float32Array;
  densityG: Float32Array;
  densityB: Float32Array;
  
  Vx: Float32Array;
  Vy: Float32Array;
  Vx0: Float32Array;
  Vy0: Float32Array;

  constructor(dt: number, diffusion: number, viscosity: number) {
    this.dt = dt;
    this.diff = diffusion;
    this.visc = viscosity;
    
    this.s = new Float32Array(SIZE);
    this.densityR = new Float32Array(SIZE);
    this.densityG = new Float32Array(SIZE);
    this.densityB = new Float32Array(SIZE);
    
    this.Vx = new Float32Array(SIZE);
    this.Vy = new Float32Array(SIZE);
    this.Vx0 = new Float32Array(SIZE);
    this.Vy0 = new Float32Array(SIZE);
  }

  reset() {
    this.densityR.fill(0);
    this.densityG.fill(0);
    this.densityB.fill(0);
    this.Vx.fill(0);
    this.Vy.fill(0);
    this.Vx0.fill(0);
    this.Vy0.fill(0);
  }

  addDensity(x: number, y: number, amountR: number, amountG: number, amountB: number, radius: number = 2) {
    for (let j = -radius; j <= radius; j++) {
      for (let i = -radius; i <= radius; i++) {
        const cx = x + i;
        const cy = y + j;
        if (cx > 0 && cx <= N && cy > 0 && cy <= N) {
          const idx = IX(cx, cy);
          const falloff = Math.max(0, 1 - Math.sqrt(i * i + j * j) / radius);
          this.densityR[idx] += amountR * falloff;
          this.densityG[idx] += amountG * falloff;
          this.densityB[idx] += amountB * falloff;
        }
      }
    }
  }

  addVelocity(x: number, y: number, amountX: number, amountY: number, radius: number = 2) {
    for (let j = -radius; j <= radius; j++) {
      for (let i = -radius; i <= radius; i++) {
        const cx = x + i;
        const cy = y + j;
        if (cx > 0 && cx <= N && cy > 0 && cy <= N) {
          const idx = IX(cx, cy);
          const falloff = Math.max(0, 1 - Math.sqrt(i * i + j * j) / radius);
          this.Vx[idx] += amountX * falloff;
          this.Vy[idx] += amountY * falloff;
        }
      }
    }
  }

  step() {
    const visc = this.visc;
    const diff = this.diff;
    const dt = this.dt;
    
    const Vx = this.Vx; const Vy = this.Vy;
    const Vx0 = this.Vx0; const Vy0 = this.Vy0;
    
    this.set_bnd(1, Vx); this.set_bnd(2, Vy);
    
    // Velocity step
    this.diffuse(1, Vx0, Vx, visc, dt);
    this.diffuse(2, Vy0, Vy, visc, dt);
    
    this.project(Vx0, Vy0, Vx, Vy);
    
    this.advect(1, Vx, Vx0, Vx0, Vy0, dt);
    this.advect(2, Vy, Vy0, Vx0, Vy0, dt);
    
    this.project(Vx, Vy, Vx0, Vy0);
    
    // Density step
    this.diffuse(0, this.s, this.densityR, diff, dt);
    this.advect(0, this.densityR, this.s, Vx, Vy, dt);
    
    this.diffuse(0, this.s, this.densityG, diff, dt);
    this.advect(0, this.densityG, this.s, Vx, Vy, dt);
    
    this.diffuse(0, this.s, this.densityB, diff, dt);
    this.advect(0, this.densityB, this.s, Vx, Vy, dt);

    // Dissipation to prevent saturation
    for (let i = 0; i < SIZE; i++) {
      this.densityR[i] *= 0.99;
      this.densityG[i] *= 0.99;
      this.densityB[i] *= 0.99;
      this.Vx[i] *= 0.999;
      this.Vy[i] *= 0.999;
    }
  }

  set_bnd(b: number, x: Float32Array) {
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
  }

  lin_solve(b: number, x: Float32Array, x0: Float32Array, a: number, c: number) {
    const cRecip = 1.0 / c;
    for (let k = 0; k < ITER; k++) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          x[IX(i, j)] = (x0[IX(i, j)] + a * (x[IX(i + 1, j)] + x[IX(i - 1, j)] + x[IX(i, j + 1)] + x[IX(i, j - 1)])) * cRecip;
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
    const dt0 = dt * (N - 2);

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
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        div[IX(i, j)] = -0.5 * (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)]) / N;
        p[IX(i, j)] = 0;
      }
    }
    this.set_bnd(0, div);
    this.set_bnd(0, p);
    this.lin_solve(0, p, div, 1, 4);
    
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        u[IX(i, j)] -= 0.5 * N * (p[IX(i + 1, j)] - p[IX(i - 1, j)]);
        v[IX(i, j)] -= 0.5 * N * (p[IX(i, j + 1)] - p[IX(i, j - 1)]);
      }
    }
    this.set_bnd(1, u);
    this.set_bnd(2, v);
  }
}

// --- React Component ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fluidRef = useRef<Fluid | null>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);
  
  const [viscosity, setViscosity] = useState<number>(0.0000);
  const [diffusion, setDiffusion] = useState<number>(0.0001);
  const [timeStep, setTimeStep] = useState<number>(0.1);
  const [showVelocity, setShowVelocity] = useState<boolean>(false);
  const [preset, setPreset] = useState<string>('free');

  const pointerRef = useRef({ isDown: false, x: 0, y: 0, px: 0, py: 0, color: 0 });
  const reqRef = useRef<number>();
  const lastTimeRef = useRef<number>(performance.now());
  const framesRef = useRef<number>(0);

  // Initialize Fluid
  useEffect(() => {
    fluidRef.current = new Fluid(timeStep, diffusion, viscosity);
    
    // Create an offscreen/hidden canvas for pixel manipulation
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = N;
    tempCanvas.height = N;
    tempCanvasRef.current = tempCanvas;
  }, []);

  // Update parameters dynamically
  useEffect(() => {
    if (fluidRef.current) {
      fluidRef.current.visc = viscosity;
      fluidRef.current.diff = diffusion;
      fluidRef.current.dt = timeStep;
    }
  }, [viscosity, diffusion, timeStep]);

  // Main Loop
  useEffect(() => {
    const render = () => {
      if (!fluidRef.current || !canvasRef.current || !tempCanvasRef.current) return;
      
      const fluid = fluidRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const tempCtx = tempCanvasRef.current.getContext('2d');
      
      if (!ctx || !tempCtx) return;

      // Handle Presets
      if (preset === 'smoke') {
        const cx = Math.floor(N / 2);
        const cy = N - 2;
        fluid.addDensity(cx, cy, 200, 100, 255, 3);
        fluid.addVelocity(cx, cy, 0, -15, 3);
        // Add tiny noise to velocity
        fluid.addVelocity(cx, cy, (Math.random() - 0.5) * 5, 0, 2);
      } else if (preset === 'vortex') {
        // Continuous flow from left
        for (let j = 1; j <= N; j++) {
          fluid.addVelocity(2, j, 5, 0, 1);
          if (j > N/4 && j < 3*N/4) {
            fluid.addDensity(2, j, 50, 200, 150, 1);
          }
        }
        // Obstacle in the middle
        const ox = Math.floor(N / 4);
        const oy = Math.floor(N / 2);
        const or = 4;
        for (let j = -or; j <= or; j++) {
          for (let i = -or; i <= or; i++) {
            if (i*i + j*j <= or*or) {
              const idx = IX(ox + i, oy + j);
              fluid.Vx[idx] = 0;
              fluid.Vy[idx] = 0;
              fluid.densityR[idx] = 0;
              fluid.densityG[idx] = 0;
              fluid.densityB[idx] = 0;
            }
          }
        }
      }

      // Step simulation
      fluid.step();

      // Render to Temp Canvas
      const imgData = tempCtx.createImageData(N, N);
      const data = imgData.data;
      
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          const idx = IX(i, j);
          const px = ((j - 1) * N + (i - 1)) * 4;
          
          data[px] = Math.min(255, fluid.densityR[idx]);
          data[px + 1] = Math.min(255, fluid.densityG[idx]);
          data[px + 2] = Math.min(255, fluid.densityB[idx]);
          data[px + 3] = 255;
        }
      }
      tempCtx.putImageData(imgData, 0, 0);

      // Draw to Main Canvas
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(tempCanvasRef.current, 0, 0, canvas.width, canvas.height);

      // Draw Obstacle for Vortex
      if (preset === 'vortex') {
        ctx.fillStyle = '#111';
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        const scale = canvas.width / N;
        ctx.arc((N/4) * scale, (N/2) * scale, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Velocity Visualization
      if (showVelocity) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        const scale = canvas.width / N;
        ctx.beginPath();
        for (let j = 2; j < N; j += 2) {
          for (let i = 2; i < N; i += 2) {
            const idx = IX(i, j);
            const x = i * scale;
            const y = j * scale;
            const vx = fluid.Vx[idx] * scale * 2;
            const vy = fluid.Vy[idx] * scale * 2;
            ctx.moveTo(x, y);
            ctx.lineTo(x + vx, y + vy);
          }
        }
        ctx.stroke();
      }

      // FPS Calculation
      framesRef.current++;
      const now = performance.now();
      if