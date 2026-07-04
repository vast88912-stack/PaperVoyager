import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Fluid Dynamics Implementation (Stable Fluids) ---
const N = 64;
const ITER = 4;
const SIZE = (N + 2) * (N + 2);

const IX = (x: number, y: number) => x + y * (N + 2);

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
  }

  reset() {
    this.s.fill(0);
    this.density.fill(0);
    this.Vx.fill(0);
    this.Vy.fill(0);
    this.Vx0.fill(0);
    this.Vy0.fill(0);
    this.p.fill(0);
    this.div.fill(0);
  }

  addDensity(x: number, y: number, amount: number) {
    const index = IX(x, y);
    if (index >= 0 && index < SIZE) {
      this.density[index] += amount;
    }
  }

  addVelocity(x: number, y: number, amountX: number, amountY: number) {
    const index = IX(x, y);
    if (index >= 0 && index < SIZE) {
      this.Vx[index] += amountX;
      this.Vy[index] += amountY;
    }
  }

  step() {
    const { visc, diff, dt, Vx, Vy, Vx0, Vy0, s, density } = this;

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
    for (let k = 0; k < ITER; k++) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          x[IX(i, j)] =
            (x0[IX(i, j)] +
              a *
                (x[IX(i - 1, j)] +
                 x[IX(i + 1, j)] +
                 x[IX(i, j - 1)] +
                 x[IX(i, j + 1)])) /
            c;
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
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        div[IX(i, j)] =
          (-0.5 *
            (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)])) /
          N;
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

// --- React Application ---

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fluidRef = useRef<Fluid>(new Fluid(0.1, 0.0, 0.0000001));
  
  const [viscosity, setViscosity] = useState<number>(0.0000001);
  const [diffusion, setDiffusion] = useState<number>(0.0);
  const [dt, setDt] = useState<number>(0.1);
  const [showPressure, setShowPressure] = useState<boolean>(false);
  const [showVelocity, setShowVelocity] = useState<boolean>(false);
  const [preset, setPreset] = useState<string>('none');
  const [fps, setFps] = useState<number>(0);

  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  // Handle Reset
  const handleReset = useCallback(() => {
    fluidRef.current.reset();
    setPreset('none');
  }, []);

  // Update fluid parameters when state changes
  useEffect(() => {
    fluidRef.current.visc = viscosity;
    fluidRef.current.diff = diffusion;
    fluidRef.current.dt = dt;
  }, [viscosity, diffusion, dt]);

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

    let animationId: number;

    const render = () => {
      const fluid = fluidRef.current;

      // Apply Presets
      if (preset === 'smoke_jet') {
        fluid.addDensity(Math.floor(N / 2), N - 2, 200);
        fluid.addVelocity(Math.floor(N / 2), N - 2, (Math.random() - 0.5) * 2, -15);
      } else if (preset === 'vortex_street') {
        // Inject flow from left
        for (let j = Math.floor(N / 2) - 5; j <= Math.floor(N / 2) + 5; j++) {
          fluid.addDensity(2, j, 150);
          fluid.addVelocity(2, j, 10, (Math.random() - 0.5) * 2);
        }
        // Obstacle in the middle (zero out velocity)
        const cx = Math.floor(N / 3);
        const cy = Math.floor(N / 2);
        for (let i = cx - 3; i <= cx + 3; i++) {
          for (let j = cy - 3; j <= cy + 3; j++) {
            fluid.Vx[IX(i, j)] = 0;
            fluid.Vy[IX(i, j)] = 0;
            fluid.density[IX(i, j)] = 0;
          }
        }
      }

      // Step simulation
      fluid.step();

      // Render Density or Pressure
      for (let i = 0; i < SIZE; i++) {
        if (showPressure) {
          const pVal = fluid.p[i] * 500; // Scale for visibility
          if (pVal > 0) {
            imgData.data[i * 4] = Math.min(pVal, 255);     // R
            imgData.data[i * 4 + 1] = 0;                   // G
            imgData.data[i * 4 + 2] = 0;                   // B
          } else {
            imgData.data[i * 4] = 0;                       // R
            imgData.data[i * 4 + 1] = 0;                   // G
            imgData.data[i * 4 + 2] = Math.min(-pVal, 255);// B
          }
          imgData.data[i * 4 + 3] = 255;                   // A
        } else {
          const d = fluid.density[i];
          // Vivid Cyan/Teal dye
          imgData.data[i * 4] = Math.min(d * 10, 255) * 0.1;       // R
          imgData.data[i * 4 + 1] = Math.min(d * 200, 255);        // G
          imgData.data[i * 4 + 2] = Math.min(d * 255, 255);        // B
          imgData.data[i * 4 + 3] = 255;                           // A
          
          // Fade density slightly over time
          fluid.density[i] *= 0.995;
        }
      }

      offCtx.putImageData(imgData, 0, 0);
      
      // Draw to main canvas (scaled up)
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);

      // Render Velocity Field
      if (showVelocity) {
        const scaleX = canvas.width / (N + 2);
        const scaleY = canvas.height / (N + 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let j = 1; j <= N; j += 2) {
          for (let i = 1; i <= N; i += 2) {
            const x = i * scaleX;
            const y = j * scaleY;
            const vx = fluid.Vx[IX(i, j)] * 20;
            const vy = fluid.Vy[IX(i, j)] *