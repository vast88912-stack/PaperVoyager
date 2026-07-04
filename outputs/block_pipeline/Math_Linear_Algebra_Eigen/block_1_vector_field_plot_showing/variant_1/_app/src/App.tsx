import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Math Utilities ---
const calculateEigen = (a: number, b: number, c: number, d: number) => {
  const trace = a + d;
  const det = a * d - b * c;
  const discriminant = trace * trace - 4 * det;
  
  let isComplex = false;
  let lambda1 = '';
  let lambda2 = '';
  let mag1 = 0;
  let mag2 = 0;

  if (discriminant >= 0) {
    const sqrtD = Math.sqrt(discriminant);
    const l1 = (trace + sqrtD) / 2;
    const l2 = (trace - sqrtD) / 2;
    lambda1 = l1.toFixed(2);
    lambda2 = l2.toFixed(2);
    mag1 = Math.abs(l1);
    mag2 = Math.abs(l2);
  } else {
    isComplex = true;
    const real = trace / 2;
    const imag = Math.sqrt(-discriminant) / 2;
    lambda1 = `${real.toFixed(2)} + ${imag.toFixed(2)}i`;
    lambda2 = `${real.toFixed(2)} - ${imag.toFixed(2)}i`;
    mag1 = Math.sqrt(real * real + imag * imag);
    mag2 = mag1;
  }

  const isStable = mag1 < 1 && mag2 < 1;
  const isNeutral = Math.abs(mag1 - 1) < 0.01 && Math.abs(mag2 - 1) < 0.01;

  return { trace, det, discriminant, isComplex, lambda1, lambda2, mag1, mag2, isStable, isNeutral };
};

// --- Presets ---
const PRESETS = [
  { name: 'Identity', matrix: [1, 0, 0, 1] },
  { name: 'Rotation (90°)', matrix: [0, -1, 1, 0] },
  { name: 'Shear X', matrix: [1, 1.5, 0, 1] },
  { name: 'Scale & Flip', matrix: [1.2, 0, 0, -0.8] },
  { name: 'Saddle', matrix: [1.1, 0.2, 0.2, 0.9] },
  { name: 'Complex Spiral', matrix: [0.9, -0.5, 0.5, 0.9] },
  { name: 'Collapse', matrix: [0.5, 0, 0, 0.5] },
];

export default function App() {
  const [matrix, setMatrix] = useState<[number, number, number, number]>([0.9, -0.5, 0.5, 0.9]);
  const [a, b, c, d] = matrix;
  
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);
  const matrixRef = useRef(matrix);
  const animationRef = useRef<number>();

  const stats = useMemo(() => calculateEigen(a, b, c, d), [a, b, c, d]);

  // Update ref for the animation loop to use the latest matrix without re-binding
  useEffect(() => {
    matrixRef.current = matrix;
  }, [matrix]);

  // --- Background Canvas: Static Grid & Vector Field ---
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const scale = width / 20; // Viewport from -10 to 10

    const mapX = (x: number) => width / 2 + x * scale;
    const mapY = (y: number) => height / 2 - y * scale;

    ctx.clearRect(0, 0, width, height);

    // Draw Grid
    ctx.lineWidth = 1;
    for (let i = -10; i <= 10; i++) {
      ctx.strokeStyle = i === 0 ? '#94a3b8' : '#e2e8f0'; // Thicker axes
      ctx.beginPath();
      ctx.moveTo(mapX(i), 0);
      ctx.lineTo(mapX(i), height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, mapY(i));
      ctx.lineTo(width, mapY(i));
      ctx.stroke();
    }

    // Draw Vector Field (Arrows)
    // We visualize the displacement field: V(x) = Ax - x
    ctx.lineWidth = 1.5;
    for (let x = -10; x <= 10; x += 1.5) {
      for (let y = -10; y <= 10; y += 1.5) {
        if (x === 0 && y === 0) continue;

        const vx = (a - 1) * x + b * y;
        const vy = c * x + (d - 1) * y;
        const mag = Math.sqrt(vx * vx + vy * vy);
        
        if (mag < 0.05) continue;

        // Color based on magnitude (stretch)
        const hue = Math.max(0, 240 - mag * 30);
        ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.6)`;
        ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.6)`;

        // Scale arrow for visualization
        const arrowLen = Math.min(mag * 0.4, 1.2);
        const dx = (vx / mag) * arrowLen;
        const dy = (vy / mag) * arrowLen;

        const startX = mapX(x);
        const startY = mapY(y);
        const endX = mapX(x + dx);
        const endY = mapY(y + dy);

        // Draw line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw arrowhead
        const angle = Math.atan2(-dy, dx); // -dy because canvas y is inverted
        const headlen = 6;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.fill();
      }
    }
  }, [a, b, c, d]);

  // --- Foreground Canvas: Animated Particles ---
  useEffect(() => {
    const canvas = fgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const scale = width / 20;

    const mapX = (x: number) => width / 2 + x * scale;
    const mapY = (y: number) => height / 2 - y * scale;

    interface Particle {
      x: number;
      y: number;
      age: number;
      maxAge: number;
      color: string;
    }

    const particles: Particle[] = [];
    const numParticles = 300;

    const spawnParticle = (): Particle => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 10;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        age: 0,
        maxAge: 50 + Math.random() * 100,
        color: `hsl(${190 + Math.random() * 60}, 100%, 60%)` // Cyan to Purple
      };
    };

    for (let i = 0; i < numParticles; i++) {
      particles.push(spawnParticle());
    }

    const dt = 0.015; // Time step for integration

    const render = () => {
      // Fade effect for trails
      ctx.fillStyle = 'rgba(248, 250, 252, 0.15)'; // matches tailwind slate-50
      ctx.fillRect(0, 0, width, height);

      const [ca, cb, cc, cd] = matrixRef.current;

      particles.forEach((p, i) => {
        // Displacement vector: V = Ax - x
        const vx = (ca - 1) * p.x + cb * p.y;
        const vy = cc * p.x + (cd - 1) * p.y;

        p.x += vx * dt;
        p.y += vy * dt;
        p.age++;

        // Numeric stability guard & bounds check
        const distSq = p.x * p.x + p.y * p.y;
        if (isNaN(p.x) || isNaN(p.y) || distSq > 400 || p.age > p.maxAge) {
          particles[i] = spawnParticle();
          return;
        }

        ctx.beginPath();
        ctx.arc(mapX(p.x), mapY(p.y), 1.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // --- Handlers ---
  const handleInputChange = (index: number, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const newMatrix = [...matrix] as [number, number, number, number];
    newMatrix[index] = num;
    setMatrix(newMatrix);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8 selection:bg-indigo-100">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="border-b border-slate-200 pb-4">
          <h1 className="text-3xl md:text-4xl font-light tracking-tight text-slate-900">
            Eigen Explorer <span className="text-indigo-500 font-medium">Vector Field</span>
          </h1>
          <p className="text-slate-500 mt-2">
            Visualize linear transformations, stretch, and rotation through continuous dynamical fields.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Controls & Stats */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Matrix Editor */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Matrix Editor</h2>
              
              <div className="flex justify-center items-center mb-6">
                <div className="text-4xl font-light text-slate-300 mr-2">[</div>
                <div className="grid grid-cols-2 gap-3">
                  {[a, b, c, d].map((val, idx) => (
                    <input
                      key={idx}
                      type="number"
                      step="0.1"
                      value={val}
                      onChange={(e) => handleInputChange(idx, e.target.value)}
                      className="w-20 text-center text-lg font-medium bg-slate-50 border border-slate-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                    />
                  ))}
                </div>
                <div className="text-4xl font-light text-slate-300 ml-2">]</div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Presets</h3>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setMatrix(preset.matrix as [number, number, number, number])}
                      className