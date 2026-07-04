import React, { useEffect, useRef, useState } from 'react';

// --- Fluid Dynamics Implementation (Jos Stam's Stable Fluids) ---
const N = 64;
const iter = 10;
const SIZE = (N + 2) * (N + 2);

function IX(x: number, y: number) {
  return x + (N + 2) * y;
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
  
  pressure: Float32Array;
  divergence: Float32Array;

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
    
    this.pressure = new Float32Array(SIZE);
    this.divergence = new Float32Array(SIZE);
  }

  reset() {
    this.s.fill(0);
    this.density.fill(0);
    this.Vx.fill(0);
    this.Vy.fill(0);
    this.Vx0.fill(0);
    this.Vy0.fill(0);
    this.pressure.fill(0);
    this.divergence.fill(0);
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
    const pressure = this.pressure;
    const divergence = this.divergence;

    this.diffuse(1, Vx0, Vx, visc, dt);
    this.diffuse(2, Vy0, Vy, visc, dt);
    
    this.project(Vx0, Vy0, Vx, Vy, pressure, divergence);
    
    this.advect(1, Vx, Vx0, Vx0, Vy0, dt);
    this.advect(2, Vy, Vy0, Vx0, Vy0, dt);
    
    this.project(Vx, Vy, Vx0, Vy0, pressure, divergence);
    
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

  diffuse(b: number, x: Float32Array, x0: Float32Array, diff: number, dt: number) {
    const a = dt * diff * (N - 2) * (N - 2);
    this.lin_solve(b, x, x0, a, 1 + 6 * a);
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

  project(u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array, storePressure: Float32Array, storeDivergence: Float32Array) {
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
        
        // Store for visualization
        storePressure[IX(i, j)] = p[IX(i, j)];
        storeDivergence[IX(i, j)] = div[IX(i, j)];
      }
    }
    this.set_bnd(1, u);
    this.set_bnd(2, v);
  }
}

// --- React Component ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fluidRef = useRef<Fluid>(new Fluid(0.1, 0.0, 0.0000001));
  const offscreenCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const reqRef = useRef<number>();
  
  const [viscosity, setViscosity] = useState<number>(0.0000001);
  const [diffusion, setDiffusion] = useState<number>(0.0);
  const [dt, setDt] = useState<number>(0.1);
  
  const [showPressure, setShowPressure] = useState<boolean>(false);
  const [showVelocity, setShowVelocity] = useState<boolean>(false);
  
  const [fps, setFps] = useState<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const framesRef = useRef<number>(0);

  const isMouseDown = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const activePreset = useRef<string | null>(null);

  useEffect(() => {
    offscreenCanvasRef.current.width = N;
    offscreenCanvasRef.current.height = N;
  }, []);

  useEffect(() => {
    fluidRef.current.visc = viscosity;
    fluidRef.current.diff = diffusion;
    fluidRef.current.dt = dt;
  }, [viscosity, diffusion, dt]);

  const renderFluid = () => {
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    if (!canvas || !offscreen) return;
    
    const ctx = canvas.getContext('2d');
    const offCtx = offscreen.getContext('2d');
    if (!ctx || !offCtx) return;

    const fluid = fluidRef.current;
    
    // Handle Presets
    if (activePreset.current === 'smoke') {
      const cx = Math.floor(N / 2);
      const cy = N - 2;
      fluid.addDensity(cx, cy, 200);
      fluid.addVelocity(cx, cy, (Math.random() - 0.5) * 2, -15);
    } else if (activePreset.current === 'vortex') {
      const cx = 2;
      const cy = Math.floor(N / 2);
      fluid.addDensity(cx, cy, 150);
      fluid.addVelocity(cx, cy, 20, Math.sin(Date.now() / 200) * 5);
    }

    fluid.step();

    // Render to offscreen canvas
    const imgData = offCtx.createImageData(N, N);
    const data = imgData.data;

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        const idx = IX(i, j);
        const pixelIdx = ((j - 1) * N + (i - 1)) * 4;

        if (showPressure) {
          // Pressure Visualization (Red = Positive, Blue = Negative)
          const p = fluid.pressure[idx] * 5000; // Scale up for visibility
          if (p > 0) {
            data[pixelIdx] = Math.min(255, p);     // R
            data[pixelIdx + 1] = 0;                // G
            data[pixelIdx + 2] = 0;                // B
          } else {
            data[pixelIdx] = 0;                    // R
            data[pixelIdx + 1] = 0;                // G
            data[pixelIdx + 2] = Math.min(255, -p);// B
          }
          data[pixelIdx + 3] = 255;                // A
        } else {
          // Dye Visualization (Vivid Cyan/Blue)
          const d = fluid.density[idx];
          data[pixelIdx] = Math.min(255, d * 0.1);     // R
          data[pixelIdx + 1] = Math.min(255, d * 0.8); // G
          data[pixelIdx + 2] = Math.min(255, d * 1.5); // B
          data[pixelIdx + 3] = 255;                    // A
          
          // Fade dye slightly over time
          fluid.density[idx] *= 0.995;
        }
      }
    }

    offCtx.putImageData(imgData, 0, 0);

    // Draw scaled up to main canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Use nearest-neighbor for crisp grid or linear for smooth
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);

    // Draw Velocity Field
    if (showVelocity) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const scaleX = canvas.width / N;
      const scaleY = canvas.height / N;
      
      for (let j = 1; j <= N; j += 2) {
        for (let i = 1; i <= N; i += 2) {
          const idx = IX(i, j);
          const vx = fluid.Vx[idx];
          const vy = fluid.Vy[idx];
          const x = (i - 0.5) * scaleX;
          const y = (j - 0.5) * scaleY;
          
          ctx.moveTo(x, y);
          ctx.lineTo(x + vx * scaleX * 0.5, y + vy * scaleY * 0.5);
        }
      }
      ctx.stroke();
    }

    // FPS Calculation
    framesRef.current++;
    const now = performance.now();
    if (now - lastTimeRef.current >= 1000) {
      setFps(framesRef.current);
      framesRef.current = 0;
      lastTimeRef.current = now;
    }

    reqRef.current = requestAnimationFrame(renderFluid);
  };

  useEffect(() => {
    reqRef.current = requestAnimationFrame(renderFluid);
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [showPressure, showVelocity]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isMouseDown.current = true;
    const rect = canvasRef.current!.getBoundingClientRect();
    lastMouse.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    injectFluid(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMouseDown.current) return;
    injectFluid(e);
  };

  const handlePointerUp = () => {
    isMouseDown.current = false;
  };

  const injectFluid = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const gridX = Math.floor((x / canvas.width) * N) + 1;
    const gridY = Math.floor((y / canvas.height) * N) + 1;
    
    const dx = x - lastMouse.current.x;
    const dy = y - lastMouse.current.y;
    
    fluidRef.current.addDensity(gridX, gridY, 300);
    fluidRef.current.addVelocity(gridX, gridY, dx * 0.5, dy * 0.5);
    
    lastMouse.current = { x, y };
  };

  return (
    <div className="flex h-screen w-full bg-gray-950 text-gray-100 font-sans overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 p-6 flex flex-col gap-6 overflow-y-auto z-10 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            Fluid Sandbox
          </h1>
          <p className="text-xs text-gray-400 mt-1">Stable Fluids (Navier-Stokes)</p>
        </div>

        {/* Core Feature: Toggle Pressure Visualization */}
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Visualization</h2>
          
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`relative w-12 h-6 transition-colors rounded-full ${showPressure ? 'bg-red-500' : 'bg-cyan-500'}`}>
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${showPressure ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm font-medium group-hover:text-white transition-colors">
              {showPressure ? 'Pressure Map (Red/Blue)' : 'Dye Map (Cyan)'}
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={showVelocity} 
              onChange={(e) => setShowVelocity(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900 bg-gray-700"
            />
            <span className="text-sm font-medium group-hover:text-white transition-colors">Show Velocity Vectors</span>
          </label>
        </div>

        {/* Simulation Parameters */}
        <div className="space-y-5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Parameters</h2>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label>Viscosity</label>
              <span className="text-cyan-400">{viscosity.toExponential(2)}</span>
            </div>
            <input 
              type="range" min="0" max="0.001" step="0.00001" 
              value={viscosity} onChange={(e) => setViscosity(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label>Diffusion</label>
              <span className="text-cyan-400">{diffusion.toFixed(4)}</span>
            </div>
            <input 
              type="range" min="0" max="0.01" step="0.0001" 
              value={diffusion} onChange={(e) => setDiffusion(parseFloat(e.target.value))}
              className="w-full