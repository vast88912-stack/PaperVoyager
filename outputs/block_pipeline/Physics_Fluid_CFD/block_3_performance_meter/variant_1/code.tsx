import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

// --- STABLE FLUIDS SOLVER (CPU) ---
// Based on Jos Stam's "Real-Time Fluid Dynamics for Games"

const N = 64;
const ITER = 4;
const SIZE = (N + 2) * (N + 2);

function IX(x: number, y: number) {
  return x + y * (N + 2);
}

class Fluid {
  s: Float32Array;
  density: Float32Array;
  Vx: Float32Array;
  Vy: Float32Array;
  Vx0: Float32Array;
  Vy0: Float32Array;
  pressure: Float32Array;

  constructor() {
    this.s = new Float32Array(SIZE);
    this.density = new Float32Array(SIZE);
    this.Vx = new Float32Array(SIZE);
    this.Vy = new Float32Array(SIZE);
    this.Vx0 = new Float32Array(SIZE);
    this.Vy0 = new Float32Array(SIZE);
    this.pressure = new Float32Array(SIZE);
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

  addSource(x: Float32Array, s: Float32Array, dt: number) {
    for (let i = 0; i < SIZE; i++) x[i] += s[i] * dt;
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
    const cRecip = 1.0 / c;
    for (let k = 0; k < ITER; k++) {
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
    let dt0 = dt * N;

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

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        u[IX(i, j)] -= 0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)]) / h;
        v[IX(i, j)] -= 0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)]) / h;
      }
    }
    this.setBnd(1, u);
    this.setBnd(2, v);
    
    // Store pressure for visualization
    for (let i = 0; i < SIZE; i++) {
      this.pressure[i] = p[i];
    }
  }

  step(dt: number, visc: number, diff: number) {
    // Velocity step
    this.addSource(this.Vx, this.Vx0, dt);
    this.addSource(this.Vy, this.Vy0, dt);
    
    let temp = this.Vx0; this.Vx0 = this.Vx; this.Vx = temp;
    this.diffuse(1, this.Vx, this.Vx0, visc, dt);
    
    temp = this.Vy0; this.Vy0 = this.Vy; this.Vy = temp;
    this.diffuse(2, this.Vy, this.Vy0, visc, dt);
    
    this.project(this.Vx, this.Vy, this.Vx0, this.Vy0);
    
    temp = this.Vx0; this.Vx0 = this.Vx; this.Vx = temp;
    temp = this.Vy0; this.Vy0 = this.Vy; this.Vy = temp;
    
    this.advect(1, this.Vx, this.Vx0, this.Vx0, this.Vy0, dt);
    this.advect(2, this.Vy, this.Vy0, this.Vx0, this.Vy0, dt);
    
    this.project(this.Vx, this.Vy, this.Vx0, this.Vy0);

    // Density step
    this.addSource(this.density, this.s, dt);
    temp = this.s; this.s = this.density; this.density = temp;
    this.diffuse(0, this.density, this.s, diff, dt);
    temp = this.s; this.s = this.density; this.density = temp;
    this.advect(0, this.density, this.s, this.Vx, this.Vy, dt);

    // Clear inputs
    this.Vx0.fill(0);
    this.Vy0.fill(0);
    this.s.fill(0);
  }
}

// --- PERFORMANCE METER COMPONENT ---
export interface PerfMeterRef {
  pushData: (fps: number, simMs: number, renderMs: number) => void;
}

const PerformanceMeter = forwardRef<PerfMeterRef>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const historyLen = 100;
  const fpsHist = useRef(new Float32Array(historyLen)).current;
  const simHist = useRef(new Float32Array(historyLen)).current;
  const renderHist = useRef(new Float32Array(historyLen)).current;
  const histIdx = useRef(0);

  const [latest, setLatest] = useState({ fps: 0, sim: 0, render: 0 });

  useImperativeHandle(ref, () => ({
    pushData: (fps, simMs, renderMs) => {
      const idx = histIdx.current;
      fpsHist[idx] = fps;
      simHist[idx] = simMs;
      renderHist[idx] = renderMs;
      
      histIdx.current = (idx + 1) % historyLen;

      // Throttle React state updates to ~4 times a second for text display
      if (idx % 15 === 0) {
        setLatest({ fps: Math.round(fps), sim: simMs, render: renderMs });
      }

      drawGraph();
    }
  }));

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw Grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<w; i+=20) { ctx.moveTo(i, 0); ctx.lineTo(i, h); }
    for(let i=0; i<h; i+=20) { ctx.moveTo(0, i); ctx.lineTo(w, i); }
    ctx.stroke();

    const drawLine = (data: Float32Array, color: string, maxVal: number, fill: boolean) => {
      ctx.beginPath();
      for (let i = 0; i < historyLen; i++) {
        // Read from oldest to newest
        const readIdx = (histIdx.current + i) % historyLen;
        const val = data[readIdx];
        const x = (i / (historyLen - 1)) * w;
        const y = h - (Math.min(val, maxVal) / maxVal) * h;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      
      if (fill) {
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    // Render Time (Magenta area)
    drawLine(renderHist, 'rgba(236, 72, 153, 0.3)', 16, true);
    // Sim Time (Cyan area)
    drawLine(simHist, 'rgba(6, 182, 212, 0.4)', 16, true);
    // FPS (Green line)
    drawLine(fpsHist, '#10B981', 120, false);
  };

  return (
    <div className="absolute top-4 right-4 w-72 bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-4 shadow-2xl pointer-events-none z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold tracking-wider text-gray-400">PROFILER</h3>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      </div>

      <div className="flex items-end gap-3 mb-4">
        <div className="flex-1">
          <div className="text-3xl font-black text-white leading-none">
            {latest.fps} <span className="text-sm font-normal text-gray-500">FPS</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 text-right">
          <div className="text-xs font-mono">
            <span className="text-cyan-400 mr-2">SIM:</span>
            <span className="text-white">{latest.sim.toFixed(1)}ms</span>
          </div>
          <div className="text-xs font-mono">
            <span className="text-pink-400 mr-2">RND:</span>
            <span className="text-white">{latest.render.toFixed(1)}ms</span>
          </div>
        </div>
      </div>

      <div className="relative h-24 w-full bg-gray-950 rounded-lg overflow-hidden border border-gray-800">
        <canvas ref={canvasRef} width={250} height={96} className="w-full h-full" />
        <div className="absolute top-1 left-1 text-[9px] text-gray-500 font-mono">60 FPS</div>
        <div className="absolute bottom-1 left-1 text-[9px] text-gray-500 font-mono">0 FPS</div>
      </div>
    </div>
  );
});

// --- MAIN APP COMPONENT ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement>(null);
  const perfMeterRef = useRef<PerfMeterRef>(null);
  
  const fluidRef