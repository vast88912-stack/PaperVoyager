import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Fluid Dynamics Solver (Stable Fluids) ---
const N = 80;
const N_TOT = (N + 2) * (N + 2);
const ITER = 10;

const IX = (x: number, y: number) => x + (N + 2) * y;

const set_bnd = (b: number, x: Float32Array, obs: Uint8Array) => {
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

  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      if (obs[IX(i, j)]) {
        if (b === 1) x[IX(i, j)] = 0;
        else if (b === 2) x[IX(i, j)] = 0;
        else x[IX(i, j)] = 0;
      }
    }
  }
};

const lin_solve = (b: number, x: Float32Array, x0: Float32Array, a: number, c: number, obs: Uint8Array) => {
  for (let k = 0; k < ITER; k++) {
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        if (obs[IX(i, j)]) continue;
        x[IX(i, j)] =
          (x0[IX(i, j)] +
            a * (x[IX(i - 1, j)] + x[IX(i + 1, j)] + x[IX(i, j - 1)] + x[IX(i, j + 1)])) /
          c;
      }
    }
    set_bnd(b, x, obs);
  }
};

const diffuse = (b: number, x: Float32Array, x0: Float32Array, diff: number, dt: number, obs: Uint8Array) => {
  const a = dt * diff * N * N;
  lin_solve(b, x, x0, a, 1 + 4 * a, obs);
};

const advect = (b: number, d: Float32Array, d0: Float32Array, u: Float32Array, v: Float32Array, dt: number, obs: Uint8Array) => {
  let i0, j0, i1, j1;
  let x, y, s0, t0, s1, t1;
  const dt0 = dt * N;

  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      if (obs[IX(i, j)]) continue;

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
  set_bnd(b, d, obs);
};

const project = (u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array, obs: Uint8Array) => {
  const h = 1.0 / N;
  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      if (obs[IX(i, j)]) {
        div[IX(i, j)] = 0;
        p[IX(i, j)] = 0;
        continue;
      }
      div[IX(i, j)] =
        -0.5 * h * (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)]);
      p[IX(i, j)] = 0;
    }
  }
  set_bnd(0, div, obs);
  set_bnd(0, p, obs);

  lin_solve(0, p, div, 1, 4, obs);

  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      if (obs[IX(i, j)]) {
        u[IX(i, j)] = 0;
        v[IX(i, j)] = 0;
        continue;
      }
      u[IX(i, j)] -= (0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)])) / h;
      v[IX(i, j)] -= (0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)])) / h;
    }
  }
  set_bnd(1, u, obs);
  set_bnd(2, v, obs);
};

type PresetType = 'none' | 'smokeJet' | 'vortexStreet';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Controls state
  const [viscosity, setViscosity] = useState<number>(0.0);
  const [diffusion, setDiffusion] = useState<number>(0.0);
  const [dt, setDt] = useState<number>(0.1);
  const [showPressure, setShowPressure] = useState<boolean>(false);
  const [preset, setPreset] = useState<PresetType>('smokeJet');
  const [fps, setFps] = useState<number>(0);

  // Simulation Data (Refs to prevent re-renders)
  const sim = useRef({
    s: new Float32Array(N_TOT),
    density: new Float32Array(N_TOT),
    Vx: new Float32Array(N_TOT),
    Vy: new Float32Array(N_TOT),
    Vx0: new Float32Array(N_TOT),
    Vy0: new Float32Array(N_TOT),
    p: new Float32Array(N_TOT),
    div: new Float32Array(N_TOT),
    obs: new Uint8Array(N_TOT),
  });

  const offscreenCanvas = useRef(document.createElement('canvas'));
  const mouse = useRef({ x: 0, y: 0, isDown: false, dx: 0, dy: 0 });
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const reqRef = useRef<number>();

  const resetSim = useCallback(() => {
    const s = sim.current;
    s.s.fill(0);
    s.density.fill(0);
    s.Vx.fill(0);
    s.Vy.fill(0);
    s.Vx0.fill(0);
    s.Vy0.fill(0);
    s.p.fill(0);
    s.div.fill(0);
    s.obs.fill(0);

    if (preset === 'vortexStreet') {
      // Create a rectangular obstacle for the vortex street
      const cx = Math.floor(N * 0.25);
      const cy = Math.floor(N * 0.5);
      const w = Math.floor(N * 0.08);
      const h = Math.floor(N * 0.2);
      for (let j = cy - h; j <= cy + h; j++) {
        for (let i = cx - w; i <= cx + w; i++) {
          s.obs[IX(i, j)] = 1;
        }
      }
    }
  }, [preset]);

  // Handle Preset changes
  useEffect(() => {
    resetSim();
  }, [preset, resetSim]);

  // Main Simulation Step
  const step = useCallback(() => {
    const s = sim.current;
    
    // 1. Velocity Step
    // Swap arrays
    let temp = s.Vx0; s.Vx0 = s.Vx; s.Vx = temp;
    temp = s.Vy0; s.Vy0 = s.Vy; s.Vy = temp;
    
    diffuse(1, s.Vx, s.Vx0, viscosity, dt, s.obs);
    diffuse(2, s.Vy, s.Vy0, viscosity, dt, s.obs);
    
    project(s.Vx, s.Vy, s.p, s.div, s.obs);
    
    temp = s.Vx0; s.Vx0 = s.Vx; s.Vx = temp;
    temp = s.Vy0; s.Vy0 = s.Vy; s.Vy = temp;
    
    advect(1, s.Vx, s.Vx0, s.Vx0, s.Vy0, dt, s.obs);
    advect(2, s.Vy, s.Vy0, s.Vx0, s.Vy0, dt, s.obs);
    
    project(s.Vx, s.Vy, s.p, s.div, s.obs);

    // 2. Density Step
    temp = s.s; s.s = s.density; s.density = temp;
    
    diffuse(0, s.density, s.s, diffusion, dt, s.obs);
    
    temp = s.s; s.s = s.density; s.density = temp;
    
    advect(0, s.density, s.s, s.Vx, s.Vy, dt, s.obs);

  }, [viscosity, diffusion, dt]);

  // Render Frame
  const renderCanvas = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const s = sim.current;
    const offCtx = offscreenCanvas.current.getContext('2d')!;
    
    if (offscreenCanvas.current.width !== N) {
      offscreenCanvas.current.width = N;
      offscreenCanvas.current.height = N;
    }

    const imgData = offCtx.createImageData(N, N);
    const data = imgData.data;

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        const idx = IX(i, j);
        const pxIdx = ((j - 1) * N + (i - 1)) * 4;

        if (s.obs[idx]) {
          data[pxIdx] = 50;     // R
          data[pxIdx + 1] = 50; // G
          data[pxIdx + 2] = 50; // B
          data[pxIdx + 3] = 255; // A
        } else if (showPressure) {
          const pVal = s.p[idx] * 2000;
          data[pxIdx] = pVal > 0 ? pVal : 0;
          data[pxIdx + 1] = 0;
          data[pxIdx + 2] = pVal < 0 ? -pVal : 0;
          data[pxIdx + 3] = 255;
        } else {
          const d = Math.min(255, s.density[idx]);
          // Vivid cyan/blue mix for dye
          data[pxIdx] = d * 0.1;