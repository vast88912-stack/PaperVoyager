import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Math & Optimization Functions ---
const MATH_BOUNDS = 5;

const FUNCTIONS = {
  bowl: {
    name: 'Bowl (Convex)',
    f: (x, y) => 0.5 * (x * x + y * y),
    df: (x, y) => ({ dx: x, dy: y }),
  },
  saddle: {
    name: 'Saddle Point',
    f: (x, y) => x * x - y * y,
    df: (x, y) => ({ dx: 2 * x, dy: -2 * y }),
  },
  rastrigin: {
    name: 'Rastrigin (Non-Convex)',
    f: (x, y) => 20 + x * x - 10 * Math.cos(2 * Math.PI * x) + y * y - 10 * Math.cos(2 * Math.PI * y),
    df: (x, y) => ({
      dx: 2 * x + 20 * Math.PI * Math.sin(2 * Math.PI * x),
      dy: 2 * y + 20 * Math.PI * Math.sin(2 * Math.PI * y),
    }),
  },
};

const OPTIMIZERS = {
  gd: { name: 'Gradient Descent', color: '#06b6d4' }, // Cyan
  momentum: { name: 'Momentum', color: '#ec4899' }, // Pink
  adam: { name: 'Adam', color: '#14b8a6' }, // Bright Teal
};

// --- Component ---
export default function App() {
  const [activeFunc, setActiveFunc] = useState('bowl');
  const [activeOpt, setActiveOpt] = useState('adam');
  const [learningRate, setLearningRate] = useState(0.05);
  const [compareMode, setCompareMode] = useState(false);
  const [isOverlaying, setIsOverlaying] = useState(false);

  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const pathCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const pathsRef = useRef<any[]>([]);

  // Coordinate Mapping
  const mapToScreen = (x: number, y: number, width: number, height: number) => {
    return {
      sx: ((x + MATH_BOUNDS) / (2 * MATH_BOUNDS)) * width,
      sy: ((MATH_BOUNDS - y) / (2 * MATH_BOUNDS)) * height,
    };
  };

  const mapToMath = (sx: number, sy: number, width: number, height: number) => {
    return {
      mx: (sx / width) * 2 * MATH_BOUNDS - MATH_BOUNDS,
      my: MATH_BOUNDS - (sy / height) * 2 * MATH_BOUNDS,
    };
  };

  // Render Contour Background
  const renderBackground = useCallback(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const func = FUNCTIONS[activeFunc as keyof typeof FUNCTIONS];
    const zs = new Float32Array(width * height);
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const { mx, my } = mapToMath(px, py, width, height);
        const z = func.f(mx, my);
        const i = py * width + px;
        zs[i] = z;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }

    const contourStep = (maxZ - minZ) / 20;

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const i = py * width + px;
        const norm = (zs[i] - minZ) / (maxZ - minZ || 1);

        // Charcoal base (#111827 to #1f2937)
        let r = 17 + norm * 20;
        let g = 24 + norm * 25;
        let b = 39 + norm * 30;

        // Overlay Teal contours
        const z = zs[i] - minZ;
        const distToContour = z % contourStep;
        if (distToContour < contourStep * 0.1) {
          const contourIntensity = 1 - distToContour / (contourStep * 0.1);
          r += 20 * contourIntensity;
          g += 100 * contourIntensity;
          b += 90 * contourIntensity;
        }

        const idx = i * 4;
        data[idx] = Math.min(255, r);
        data[idx + 1] = Math.min(255, g);
        data[idx + 2] = Math.min(255, b);
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, [activeFunc]);

  useEffect(() => {
    renderBackground();
    pathsRef.current = [];
  }, [renderBackground]);

  // Animation Loop for Paths
  const animatePaths = useCallback(() => {
    const canvas = pathCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const func = FUNCTIONS[activeFunc as keyof typeof FUNCTIONS];

    // Clear transparent path canvas
    ctx.clearRect(0, 0, width, height);

    let activeCount = 0;

    pathsRef.current.forEach((path) => {
      if (path.active) {
        activeCount++;
        const { x, y } = path.current;
        let { dx, dy } = func.df(x, y);

        // Gradient clipping to prevent explosive diverging (especially Rastrigin)
        const gradMag = Math.hypot(dx, dy);
        if (gradMag > 50) {
          dx = (dx / gradMag) * 50;
          dy = (dy / gradMag) * 50;
        }

        let stepX = 0;
        let stepY = 0;

        if (path.opt === 'gd') {
          stepX = path.lr * dx;
          stepY = path.lr * dy;
        } else if (path.opt === 'momentum') {
          const beta = 0.9;
          path.vx = beta * path.vx + dx;
          path.vy = beta * path.vy + dy;
          // Scale down LR slightly for standard momentum to match Adam visually
          stepX = path.lr * 0.1 * path.vx;
          stepY = path.lr * 0.1 * path.vy;
        } else if (path.opt === 'adam') {
          path.t += 1;
          const beta1 = 0.9;
          const beta2 = 0.999;
          const eps = 1e-8;

          path.mx = beta1 * path.mx + (1 - beta1) * dx;
          path.my = beta1 * path.my + (1 - beta1) * dy;
          path.vx = beta2 * path.vx + (1 - beta2) * (dx * dx);
          path.vy = beta2 * path.vy + (1 - beta2) * (dy * dy);

          const mHatX = path.mx / (1 - Math.pow(beta1, path.t));
          const mHatY = path.my / (1 - Math.pow(beta1, path.t));
          const vHatX = path.vx / (1 - Math.pow(beta2, path.t));
          const vHatY = path.vy / (1 - Math.pow(beta2, path.t));

          stepX = (path.lr * mHatX) / (Math.sqrt(vHatX) + eps);
          stepY = (path.lr * mHatY) / (Math.sqrt(vHatY) + eps);
        }

        // Clamp steps to keep within visualization bounds gracefully
        const stepMag = Math.hypot(stepX, stepY);
        const maxStep = 0.5;
        if (stepMag > maxStep) {
          stepX = (stepX / stepMag) * maxStep;
          stepY = (stepY / stepMag) * maxStep;
        }

        path.current.x -= stepX;
        path.current.y -= stepY;
        path.history.push({ x: path.current.x, y: path.current.y });

        // Stopping criteria
        if (path.history.length > 500) path.active = false;
        if (Math.hypot(dx, dy) < 1e-3) path.active = false;
        if (
          Math.abs(path.current.x) > MATH_BOUNDS * 1.5 ||
          Math.abs(path.current.y) > MATH_BOUNDS * 1.5
        ) {
          path.active = false; // Walked too far off-screen
        }
      }

      // Draw Path
      if (path.history.length > 0) {
        ctx.beginPath();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = path.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = path.color;

        const start = mapToScreen(path.history[0].x, path.history[0].y, width, height);
        ctx.moveTo(start.sx, start.sy);

        for (let i = 1; i < path.history.length; i++) {
          const pt = mapToScreen(path.history[i].x, path.history[i].y, width, height);
          ctx.lineTo(pt.sx, pt.sy);
        }
        ctx.stroke();

        // Draw glowing head
        const head = mapToScreen(path.current.x, path.current.y, width, height);
        ctx.beginPath();
        ctx.arc(head.sx, head.sy, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.stroke();
      }
    });

    setIsOverlaying(activeCount > 0);
    animationRef.current = requestAnimationFrame(animatePaths);
  }, [activeFunc]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animatePaths);
    return () => cancelAnimationFrame(animationRef.current!);
  }, [animatePaths]);

  // Handle User Interaction
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = pathCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const sy = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const { mx, my } = mapToMath(sx, sy, canvas.width, canvas.height);

    const createPath = (opt: string, color: string) => ({
      opt,
      color,
      lr: learningRate,
      active: true,
      current: { x: mx, y: my },
      history: [{ x: mx, y: my }],
      vx: 0,
      vy: 0,
      mx: 0,
      my: 0,
      t: 0,
    });

    if (compareMode) {
      pathsRef.current.push(