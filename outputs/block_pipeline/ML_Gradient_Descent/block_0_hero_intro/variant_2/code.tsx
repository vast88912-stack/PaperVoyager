import React, { useEffect, useRef } from 'react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = (e.clientX / width) * 2 - 1;
      mouse.targetY = (e.clientY / height) * 2 - 1;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    const gridSize = 45;
    const extent = 12;
    const step = (extent * 2) / gridSize;

    // Loss landscape function (Bowl + Rastrigin-like waves)
    const calcY = (x: number, z: number, t: number) => {
      const bowl = (x * x + z * z) * 0.15;
      const waves = Math.sin(x * 1.5 + t) * Math.cos(z * 1.5 + t) * 1.5;
      return bowl + waves - 4;
    };

    const render = (time: number) => {
      const t = time * 0.001;

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Clear with charcoal background
      ctx.fillStyle = '#111827'; // Tailwind gray-900
      ctx.fillRect(0, 0, width, height);

      const points: { px: number; py: number; zIndex: number; y: number }[][] = [];
      const cameraZ = 25;
      const focal = 25;

      const tilt = 0.8 + mouse.y * 0.2; // X-axis rotation
      const spin = t * 0.2 + mouse.x * 0.5; // Y-axis rotation

      // Calculate 3D points and project to 2D
      for (let i = 0; i <= gridSize; i++) {
        const row = [];
        const x0 = -extent + i * step;
        for (let j = 0; j <= gridSize; j++) {
          const z0 = -extent + j * step;

          // Rotate around Y axis (Spin)
          const x1 = x0 * Math.cos(spin) - z0 * Math.sin(spin);
          const z1 = x0 * Math.sin(spin) + z0 * Math.cos(spin);

          // Calculate height
          const y1 = calcY(x1, z1, t);

          // Rotate around X axis (Tilt)
          const y2 = y1 * Math.cos(tilt) - z1 * Math.sin(tilt);
          const z2 = y1 * Math.sin(tilt) + z1 * Math.cos(tilt);

          const zIndex = z2 + cameraZ;
          const scale = focal / Math.max(0.1, zIndex);

          const px = width / 2 + x1 * scale * 250;
          const py = height / 2 + y2 * scale * 250 + 100;

          row.push({ px, py, zIndex, y: y1 });
        }
        points.push(row);
      }

      // Draw wireframe grid
      ctx.lineWidth = 1.5;
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const p = points[i][j];
          const pRight = points[i + 1]?.[j];
          const pDown = points[i][j + 1];

          if (p.zIndex < 1) continue;

          // Color based on height to highlight minima in bright teal
          // Normalizing y roughly between -5 and 15
          const normY = Math.max(0, Math.min(1, (p.y + 5) / 15));
          const opacity = Math.max(0.1, 1 - normY - 0.1); // Lower points are more opaque
          
          // Interpolate color from bright teal (low) to dark gray/teal (high)
          const r = Math.floor(45 + normY * 50);
          const g = Math.floor(212 - normY * 150);
          const b = Math.floor(191 - normY * 100);

          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;

          if (pRight && pRight.zIndex >= 1) {
            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(pRight.px, pRight.py);
            ctx.stroke();
          }
          if (pDown && pDown.zIndex >= 1) {
            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(pDown.px, pDown.py);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden text-gray-100 font-sans selection:bg-teal-500 selection:text-gray-900">
      {/* Animated Background */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      {/* Gradient Overlay for Text Readability */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-gray-900/90 via-gray-900/60 to-transparent pointer-events-none" />

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center max-w-4xl mx-auto">
        
        {/* Top Badge */}
        <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/80 border border-gray-700 backdrop-blur-sm shadow-lg">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
          </span>
          <span className="text-sm font-medium text-gray-300 tracking-wide uppercase">Interactive ML Visualization</span>
        </div>

        {/* Main Typography */}
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter mb-6 drop-shadow-2xl">
          Gradient Descent <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200">
            Playground
          </span>
        </h1>

        <p className="text-lg md:text-2xl text-gray-400 mb-12 leading-relaxed max-w-2xl drop-shadow-md">
          Conquer the loss landscape. Master <strong className="text-gray-200 font-semibold">Momentum</strong>, <strong className="text-gray-200 font-semibold">Adam</strong>, and <strong className="text-gray-200 font-semibold">Vanilla GD</strong> through real-time 2D visualizations. No papers, just pure intuition.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
          <button className="group relative px-8 py-4 bg-teal-500 text-gray-900 font-bold text-lg rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(45,212,191,0.3)] hover:shadow-[0_0_40px_rgba(45,212,191,0.6)] hover:-translate-y-1 overflow-hidden">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative flex items-center justify-center gap-2">
              Start Exploring
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </span>
          </button>
          
          <button className="px-8 py-4 bg-gray-800/80 backdrop-blur-sm text-teal-400 font-bold text-lg rounded-full border border-gray-700 hover:border-teal-400 hover:bg-gray-800 transition-all duration-300 hover:-translate-y-1">
            Blindfold Challenge
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm text-gray-500 font-medium">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-teal-400 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            Analytic Gradients
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-teal-400 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            60fps Animation
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex