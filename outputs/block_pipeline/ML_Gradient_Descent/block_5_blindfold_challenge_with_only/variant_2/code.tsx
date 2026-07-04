import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Math & ML Definitions ---

type Point = [number, number];

interface OptState {
  t: number;
  m: Point;
  v: Point;
}

interface AppState {
  x: number;
  y: number;
  path: Point[];
  funcKey: string;
  optKey: string;
  lr: number;
  momentum: number; // Also used as beta1 for Adam
  isPlaying: boolean;
  optState: OptState;
  status: 'running' | 'converged' | 'diverged';
}

const FUNCTIONS: Record<string, { name: string; f: (x: number, y: number) => number }> = {
  bowl: {
    name: 'Symmetric Bowl',
    f: (x, y) => (x * x + y * y) / 2,
  },
  valley: {
    name: 'Steep Valley',
    f: (x, y) => (x * x + 10 * y * y) / 2,
  },
  saddle: {
    name: 'Saddle Point',
    f: (x, y) => (x * x - y * y) / 2,
  },
  rastrigin_simple: {
    name: 'Bumpy Terrain',
    f: (x, y) => (x * x + y * y) / 2 - Math.cos(2 * Math.PI * x) - Math.cos(2 * Math.PI * y) + 2,
  }
};

const OPTIMIZERS = {
  sgd: 'Vanilla SGD',
  momentum: 'Momentum',
  adam: 'Adam',
};

// Finite difference gradient
const getGradient = (fn: (x: number, y: number) => number, x: number, y: number): Point => {
  const h = 1e-5;
  const dx = (fn(x + h, y) - fn(x - h, y)) / (2 * h);
  const dy = (fn(x, y + h) - fn(x, y - h)) / (2 * h);
  return [dx, dy];
};

const INITIAL_POS: Point = [-4, 3];

export default function App() {
  const [state, setState] = useState<AppState>({
    x: INITIAL_POS[0],
    y: INITIAL_POS[1],
    path: [INITIAL_POS],
    funcKey: 'valley',
    optKey: 'momentum',
    lr: 0.1,
    momentum: 0.9,
    isPlaying: false,
    optState: { t: 0, m: [0, 0], v: [0, 0] },
    status: 'running',
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Core ML Step Logic ---
  const step = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'running') return prev;

      const fn = FUNCTIONS[prev.funcKey].f;
      const [dx, dy] = getGradient(fn, prev.x, prev.y);

      // Check for convergence
      const gradMag = Math.sqrt(dx * dx + dy * dy);
      if (gradMag < 1e-4) {
        return { ...prev, isPlaying: false, status: 'converged' };
      }

      let nx = prev.x;
      let ny = prev.y;
      const nOpt = { ...prev.optState };
      nOpt.t += 1;

      if (prev.optKey === 'sgd') {
        nx = prev.x - prev.lr * dx;
        ny = prev.y - prev.lr * dy;
      } else if (prev.optKey === 'momentum') {
        nOpt.v[0] = prev.momentum * nOpt.v[0] + prev.lr * dx;
        nOpt.v[1] = prev.momentum * nOpt.v[1] + prev.lr * dy;
        nx = prev.x - nOpt.v[0];
        ny = prev.y - nOpt.v[1];
      } else if (prev.optKey === 'adam') {
        const b1 = prev.momentum;
        const b2 = 0.999;
        const eps = 1e-8;

        nOpt.m[0] = b1 * nOpt.m[0] + (1 - b1) * dx;
        nOpt.m[1] = b1 * nOpt.m[1] + (1 - b1) * dy;
        nOpt.v[0] = b2 * nOpt.v[0] + (1 - b2) * (dx * dx);
        nOpt.v[1] = b2 * nOpt.v[1] + (1 - b2) * (dy * dy);

        const mhatX = nOpt.m[0] / (1 - Math.pow(b1, nOpt.t));
        const mhatY = nOpt.m[1] / (1 - Math.pow(b1, nOpt.t));
        const vhatX = nOpt.v[0] / (1 - Math.pow(b2, nOpt.t));
        const vhatY = nOpt.v[1] / (1 - Math.pow(b2, nOpt.t));

        nx = prev.x - (prev.lr * mhatX) / (Math.sqrt(vhatX) + eps);
        ny = prev.y - (prev.lr * mhatY) / (Math.sqrt(vhatY) + eps);
      }

      // Check for divergence
      if (!Number.isFinite(nx) || !Number.isFinite(ny) || Math.abs(nx) > 100 || Math.abs(ny) > 100) {
        return { ...prev, isPlaying: false, status: 'diverged' };
      }

      return {
        ...prev,
        x: nx,
        y: ny,
        path: [...prev.path, [nx, ny]],
        optState: nOpt,
      };
    });
  }, []);

  // --- Animation Loop ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (state.isPlaying && state.status === 'running') {
      interval = setInterval(step, 50); // 20 fps for visible path building
    }
    return () => clearInterval(interval);
  }, [state.isPlaying, state.status, step]);

  // --- Canvas Rendering (The "Blindfold Radar") ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Coordinate mapping [-5, 5] -> [0, W]
    const mapX = (x: number) => ((x + 5) / 10) * width;
    const mapY = (y: number) => ((5 - y) / 10) * height;

    // Clear background (Charcoal)
    ctx.fillStyle = '#18181b'; // zinc-900
    ctx.fillRect(0, 0, width, height);

    // Draw Radar Grid
    ctx.strokeStyle = '#27272a'; // zinc-800
    ctx.lineWidth = 1;
    for (let i = -5; i <= 5; i++) {
      ctx.beginPath(); ctx.moveTo(mapX(i), 0); ctx.lineTo(mapX(i), height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, mapY(i)); ctx.lineTo(width, mapY(i)); ctx.stroke();
    }

    // Draw Origin Marker
    ctx.beginPath();
    ctx.strokeStyle = '#3f3f46'; // zinc-700
    ctx.lineWidth = 2;
    ctx.moveTo(mapX(-0.5), mapY(0)); ctx.lineTo(mapX(0.5), mapY(0)); ctx.stroke();
    ctx.moveTo(mapX(0), mapY(-0.5)); ctx.lineTo(mapX(0), mapY(0.5)); ctx.stroke();

    // Draw Path
    if (state.path.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#2dd4bf'; // teal-400
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.moveTo(mapX(state.path[0][0]), mapY(state.path[0][1]));
      for (let i = 1; i < state.path.length; i++) {
        ctx.lineTo(mapX(state.path[i][0]), mapY(state.path[i][1]));
      }
      ctx.stroke();
    }

    // Draw Current Position
    const cx = mapX(state.x);
    const cy = mapY(state.y);
    
    // Pulse effect
    const pulseRadius = 15 + Math.sin(Date.now() / 150) * 5;
    ctx.beginPath();
    ctx.fillStyle = 'rgba(45, 212, 191, 0.2)';
    ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = '#2dd4bf';
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw Gradient Hint (Arrow pointing to steepest descent)
    if (state.status === 'running') {
      const fn = FUNCTIONS[state.funcKey].f;
      const [dx, dy] = getGradient(fn, state.x, state.y);
      const mag = Math.sqrt(dx * dx + dy * dy);

      if (mag > 1e-4) {
        // Normalize and scale for visual arrow
        const arrowLen = Math.min(80, Math.max(30, mag * 15));
        const dirX = -dx / mag; // descent direction
        const dirY = -dy / mag;

        const endX = cx + dirX * arrowLen;
        const endY = cy - dirY * arrowLen; // subtract because canvas Y is inverted

        ctx.beginPath();
        ctx.strokeStyle = '#facc15'; // yellow-400
        ctx.lineWidth = 3;
        ctx.moveTo(cx, cy);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(-(endY - cy), endX - cx);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - 12 * Math.cos(angle - Math.PI / 6),
          endY + 12 * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          endX - 12 * Math.cos(angle + Math.PI / 6),
          endY + 12 * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = '#facc15';
        ctx.fill();
      }
    }

  }, [state.x, state.y, state.path, state.funcKey, state.status]);

  // Request Animation Frame for continuous pulse rendering even when paused
  useEffect(() => {
    let req: number;
    const render = () => {
      // Force a tiny state update to trigger canvas redraw for the pulse?
      // Actually better: just redraw the canvas directly in a rAF if we want smooth pulsing.
      // For simplicity and to avoid React state spam, we'll just let it be static when paused, 
      // or rely on the interval when running.
    };
    req = requestAnimationFrame(render);
    return () => cancelAnimationFrame(req);
  }, []);

  // --- Handlers ---
  const handleReset = () => {
    setState