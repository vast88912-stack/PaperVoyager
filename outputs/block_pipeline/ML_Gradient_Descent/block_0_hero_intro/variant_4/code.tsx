import React, { useEffect, useRef } from 'react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    
    window.addEventListener('resize', resize);
    resize();

    // Particle system for gradient descent visualization
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      history: {x: number, y: number}[];

      constructor() {
        this.x = (Math.random() - 0.5) * width;
        this.y = (Math.random() - 0.5) * height;
        this.vx = 0;
        this.vy = 0;
        this.history = [];
      }

      update(isAccelerated: boolean) {
        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > 25) this.history.shift();

        // Simple bowl gradient: f(x,y) = (x/100)^2 + (y/100)^2
        // dx = 2x/10000, dy = 2y/10000
        const dx = (2 * this.x) / 10000;
        const dy = (2 * this.y) / 10000;

        const lr = 120; // Learning rate

        if (isAccelerated) {
          // Momentum/Adam approximation for visual effect
          this.vx = 0.92 * this.vx - lr * dx * 0.15;
          this.vy = 0.92 * this.vy - lr * dy * 0.15;
          this.x += this.vx;
          this.y += this.vy;
        } else {
          // Standard Gradient Descent
          this.x -= lr * dx;
          this.y -= lr * dy;
        }

        // Reset if it converges to the minimum (center)
        if (Math.abs(this.x) < 2 && Math.abs(this.y) < 2) {
          this.x = (Math.random() - 0.5) * width;
          this.y = (Math.random() - 0.5) * height;
          this.history = [];
          this.vx = 0;
          this.vy = 0;
        }
      }

      draw(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string) {
        if (this.history.length === 0) return;
        
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < this.history.length; i++) {
          const pt = this.history[i];
          if (i === 0) ctx.moveTo(cx + pt.x, cy + pt.y);
          else ctx.lineTo(cx + pt.x, cy + pt.y);
        }
        ctx.lineTo(cx + this.x, cy + this.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.arc(cx + this.x, cy + this.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const particlesGD = Array.from({ length: 12 }, () => new Particle());
    const particlesAdam = Array.from({ length: 12 }, () => new Particle());

    const render = () => {
      // Fade out effect to create trails (Zinc-900 color)
      ctx.fillStyle = 'rgba(24, 24, 27, 0.15)'; 
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Draw mathematical contour lines (level sets of the bowl)
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.05)'; // Teal-400
      ctx.lineWidth = 1;
      for (let r = 80; r < Math.max(width, height); r += 80) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Update and draw standard GD (Teal)
      particlesGD.forEach(p => {
        p.update(false);
        p.draw(ctx, cx, cy, 'rgba(45, 212, 191, 0.6)'); 
      });

      // Update and draw Momentum/Adam (Pink)
      particlesAdam.forEach(p => {
        p.update(true);
        p.draw(ctx, cx, cy, 'rgba(236, 72, 153, 0.6)'); 
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-zinc-900 overflow-hidden font-sans text-slate-200 selection:bg-teal-500/30">
      {/* Background Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-0 opacity-80"
      />

      {/* Hero Content Layer */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center pointer-events-none">
        <div className="bg-zinc-900/40 p-8 md:p-14 rounded-3xl border border-teal-500/10 backdrop-blur-xl shadow-[0_0_80px_rgba(45,212,191,0.05)] pointer-events-auto max-w-4xl w-full transition-transform duration-700 hover:scale-[1.01]">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 text-xs font-bold tracking-widest text-teal-300 uppercase bg-teal-500/10 border border-teal-500/20 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            ChatGPT Edition
          </div>

          <h1 className="mb-6 text-5xl font-extrabold tracking-tight md:text-7xl text-white drop-shadow-lg">
            Gradient Descent <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-teal-300 to-cyan-200">
              Playground
            </span>
          </h1>

          <p className="max-w-2xl mx-auto mb-10 text-lg md:text-xl text-zinc-400 leading-relaxed">
            Master the math of machine learning without reading whitepapers.
            Interact with standard GD, Momentum, and Adam on beautifully rendered 2D functions. 
            Can you find the global minimum blindfolded?
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button className="w-full sm:w-auto px-8 py-4 text-lg font-bold text-zinc-900 transition-all duration-300 bg-teal-400 rounded-full hover:bg-teal-300 hover:shadow-[0_0_25px_rgba(45,212,191,0.5)] hover:-translate-y-1 active:translate-y-0 active:shadow-none focus:outline-none focus:ring-4 focus:ring-teal-500/50">
              Enter Playground
            </button>
            <button className="w-full sm:w-auto px-8 py-4 text-lg font-bold transition-all duration-300 border-2 rounded-full text-zinc-300 border-zinc-700 hover:border-teal-400 hover:text-teal-400 hover:bg-teal-900/20 hover:-translate-y-1 active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-zinc-700">
              Blindfold Challenge
            </button>
          </div>
        </div>

        {/* Live Visualization Legend */}
        <div className="absolute bottom-8 flex gap-6 text-sm font-semibold tracking-wide text-zinc-400 bg-zinc-900/80 px-6 py-3 rounded-full border border-zinc-800 backdrop-blur-md shadow-xl pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.8)]" />
            <span>Standard GD</span>
          </div>
          <div className="w-px h-4 bg-zinc-700" />
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.8)]" />
            <span>Momentum / Adam</span>
          </div>
        </div>
      </div>
    </div>
  );
}