import React, { useEffect, useRef, useState } from 'react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHoveringButton, setIsHoveringButton] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Target parameters (the "global minimum")
    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetX = width / 2;
    let targetY = height / 2;
    let idleTime = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      idleTime = 0;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      mouseX = width / 2;
      mouseY = height / 2;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Bowl curvature (Elliptical to differentiate momentum/adam)
    const kx = 0.015;
    const ky = 0.06;

    // Optimizer base class
    class Optimizer {
      name: string;
      color: string;
      x: number;
      y: number;
      trail: { x: number; y: number }[];
      maxTrail: number;

      constructor(name: string, color: string, x: number, y: number) {
        this.name = name;
        this.color = color;
        this.x = x;
        this.y = y;
        this.trail = [];
        this.maxTrail = 60;
      }

      update(gx: number, gy: number) {
        // Implemented in subclasses
      }

      record() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) {
          this.trail.shift();
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        if (this.trail.length < 2) return;

        // Draw trail
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        for (let i = 1; i < this.trail.length; i++) {
          ctx.beginPath();
          ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
          ctx.lineTo(this.trail[i].x, this.trail[i].y);
          ctx.strokeStyle = this.color;
          ctx.globalAlpha = (i / this.trail.length) * 0.8;
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;

        // Draw head
        ctx.beginPath();
        ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px sans-serif';
        ctx.fillText(this.name, this.x + 12, this.y + 4);
      }
    }

    class SGD extends Optimizer {
      lr: number;
      constructor(x: number, y: number) {
        super('SGD', '#fb7185', x, y); // Rose 400
        this.lr = 3.5;
      }
      update(gx: number, gy: number) {
        // Add artificial noise to simulate stochasticity in the hero visual
        const noiseX = (Math.random() - 0.5) * 2.0;
        const noiseY = (Math.random() - 0.5) * 2.0;
        this.x -= this.lr * gx + noiseX;
        this.y -= this.lr * gy + noiseY;
        this.record();
      }
    }

    class Momentum extends Optimizer {
      lr: number;
      beta: number;
      vx: number;
      vy: number;
      constructor(x: number, y: number) {
        super('Momentum', '#818cf8', x, y); // Indigo 400
        this.lr = 2.5;
        this.beta = 0.92;
        this.vx = 0;
        this.vy = 0;
      }
      update(gx: number, gy: number) {
        this.vx = this.beta * this.vx + (1 - this.beta) * gx;
        this.vy = this.beta * this.vy + (1 - this.beta) * gy;
        this.x -= this.lr * this.vx;
        this.y -= this.lr * this.vy;
        this.record();
      }
    }

    class Adam extends Optimizer {
      lr: number;
      beta1: number;
      beta2: number;
      mx: number;
      my: number;
      vx: number;
      vy: number;
      t: number;
      constructor(x: number, y: number) {
        super('Adam', '#2dd4bf', x, y); // Teal 400
        this.lr = 8.0;
        this.beta1 = 0.9;
        this.beta2 = 0.999;
        this.mx = 0;
        this.my = 0;
        this.vx = 0;
        this.vy = 0;
        this.t = 0;
      }
      update(gx: number, gy: number) {
        this.t += 1;
        this.mx = this.beta1 * this.mx + (1 - this.beta1) * gx;
        this.my = this.beta1 * this.my + (1 - this.beta1) * gy;
        this.vx = this.beta2 * this.vx + (1 - this.beta2) * gx * gx;
        this.vy = this.beta2 * this.vy + (1 - this.beta2) * gy * gy;

        const mhatx = this.mx / (1 - Math.pow(this.beta1, this.t));
        const mhaty = this.my / (1 - Math.pow(this.beta1, this.t));
        const vhatx = this.vx / (1 - Math.pow(this.beta2, this.t));
        const vhaty = this.vy / (1 - Math.pow(this.beta2, this.t));

        this.x -= (this.lr * mhatx) / (Math.sqrt(vhatx) + 1e-8);
        this.y -= (this.lr * mhaty) / (Math.sqrt(vhaty) + 1e-8);
        this.record();
      }
    }

    const optimizers = [
      new SGD(width * 0.2, height * 0.2),
      new Momentum(width * 0.2, height * 0.2),
      new Adam(width * 0.2, height * 0.2),
    ];

    const render = () => {
      // Clear screen with charcoal background
      ctx.fillStyle = '#0B1120';
      ctx.fillRect(0, 0, width, height);

      // Handle idle wandering
      idleTime++;
      const time = Date.now() / 1000;
      if (idleTime > 180) {
        const wanderX = width / 2 + Math.cos(time * 0.8) * (width * 0.3);
        const wanderY = height / 2 + Math.sin(time * 1.2) * (height * 0.3);
        targetX += (wanderX - targetX) * 0.02;
        targetY += (wanderY - targetY) * 0.02;
      } else {
        targetX += (mouseX - targetX) * 0.1;
        targetY += (mouseY - targetY) * 0.1;
      }

      // Draw landscape contours
      ctx.lineWidth = 1;
      for (let i = 1; i <= 12; i++) {
        const c = i * 25; // Contour scale
        const rx = c / Math.sqrt(kx);
        const ry = c / Math.sqrt(ky);

        ctx.beginPath();
        ctx.ellipse(targetX, targetY, rx, ry, 0, 0, Math.PI * 2);
        // Fading out distant contours
        const alpha = Math.max(0, 0.15 - i * 0.01);
        ctx.strokeStyle = `rgba(45, 212, 191, ${alpha})`;
        ctx.stroke();
      }

      // Draw target indicator (Global Minimum)
      ctx.beginPath();
      ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15'; // Yellow 400
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Update and draw optimizers
      optimizers.forEach((opt) => {
        // Gradient of the elliptical bowl: f(x,y) = 0.5 * kx * (x-tx)^2 + 0.5 * ky * (y-ty)^2
        const gx = kx * (opt.x - targetX);
        const gy = ky * (opt.y - targetY);
        opt.update(gx, gy);
        opt.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0B1120] overflow-hidden font-sans text-slate-200">
      {/* Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 cursor-crosshair"
      />

      {/* Hero Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pointer-events-none">
        
        {/* Badge */}
        <div className="mb-6 px-4 py-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 backdrop-blur-md">
          <span className="text-sm font-medium text-teal-300 tracking-wide uppercase">
            Interactive ML Visualization
          </span>
        </div>

        {/* Headlines */}
        <h