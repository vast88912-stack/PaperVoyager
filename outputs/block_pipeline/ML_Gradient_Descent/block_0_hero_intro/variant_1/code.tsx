import React, { useEffect, useRef, useState } from 'react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Set initial target to center
    let target = { x: width / 2, y: height / 2 };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      target = { x: width / 2, y: height / 2 };
    };

    window.addEventListener('resize', resize);
    resize();

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      history: { x: number; y: number }[];
      color: string;
      life: number;
      maxLife: number;
      type: 'gd' | 'momentum' | 'adam';

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.history = [];
        
        const types: ('gd' | 'momentum' | 'adam')[] = ['gd', 'momentum', 'adam'];
        this.type = types[Math.floor(Math.random() * types.length)];
        
        // Colors based on optimizer type for visual variety (all in teal/cyan/blue family to match theme)
        if (this.type === 'adam') this.color = '#2dd4bf'; // teal-400
        else if (this.type === 'momentum') this.color = '#0ea5e9'; // sky-500
        else this.color = '#0f766e'; // teal-700

        this.life = 0;
        this.maxLife = Math.random() * 200 + 100;
      }

      update(targetX: number, targetY: number) {
        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > 20) this.history.shift();

        // Calculate gradient (derivative of distance squared to target)
        // Add some noise to simulate Stochastic Gradient Descent (SGD)
        const dx = (this.x - targetX) / 100;
        const dy = (this.y - targetY) / 100;
        
        const gradX = 2 * dx + (Math.random() - 0.5) * 0.5;
        const gradY = 2 * dy + (Math.random() - 0.5) * 0.5;

        const lr = 0.5;

        if (this.type === 'gd') {
          this.x -= lr * gradX * 2;
          this.y -= lr * gradY * 2;
        } else if (this.type === 'momentum') {
          const beta = 0.9;
          this.vx = beta * this.vx + (1 - beta) * gradX;
          this.vy = beta * this.vy + (1 - beta) * gradY;
          this.x -= lr * this.vx * 15;
          this.y -= lr * this.vy * 15;
        } else if (this.type === 'adam') {
          // Simplified Adam representation for visual flair
          this.vx = 0.9 * this.vx + 0.1 * gradX;
          this.vy = 0.9 * this.vy + 0.1 * gradY;
          const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) + 0.001;
          this.x -= (lr * this.vx) / speed * 3;
          this.y -= (lr * this.vy) / speed * 3;
        }

        this.life++;
      }

      draw(ctx: CanvasRenderingContext2D) {
        if (this.history.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(this.history[0].x, this.history[0].y);
        for (let i = 1; i < this.history.length; i++) {
          ctx.lineTo(this.history[i].x, this.history[i].y);
        }
        
        const opacity = Math.max(0, 1 - this.life / this.maxLife);
        ctx.strokeStyle = `${this.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Draw particle head
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `${this.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < 100; i++) {
        particles.push(new Particle(Math.random() * width, Math.random() * height));
      }
    };

    initParticles();

    const animate = () => {
      // Charcoal background with slight transparency for trail effect
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)'; // slate-900 with opacity
      ctx.fillRect(0, 0, width, height);

      // Draw target indicator (global minimum)
      ctx.beginPath();
      ctx.arc(target.x, target.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.3)'; // teal-400
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(target.x, target.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(45, 212, 191, 0.8)';
      ctx.fill();

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update(target.x, target.y);
        p.draw(ctx);

        // Respawn if dead or too close to target
        const distToTarget = Math.hypot(p.x - target.x, p.y - target.y);
        if (p.life >= p.maxLife || distToTarget < 5) {
          // Spawn from edges
          const edge = Math.floor(Math.random() * 4);
          let nx = 0, ny = 0;
          if (edge === 0) { nx = Math.random() * width; ny = -10; } // top
          else if (edge === 1) { nx = width + 10; ny = Math.random() * height; } // right
          else if (edge === 2) { nx = Math.random() * width; ny = height + 10; } // bottom
          else { nx = -10; ny = Math.random() * height; } // left
          
          particles[i] = new Particle(nx, ny);
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleMouseMove = (e: MouseEvent) => {
      target = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden font-sans text-slate-200">
      {/* Interactive Background Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-0 cursor-crosshair"
      />

      {/* Hero Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full pointer-events-none px-6">
        
        <div className="max-w-4xl w-full flex flex-col items-center text-center space-y-8">
          
          {/* Top Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-slate-800/80 border border-teal-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(45,212,191,0.1)]">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span className="text-xs font-mono tracking-wider text-teal-300 uppercase">Interactive ML Visualization</span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-lg">
            Gradient Descent <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500">
              Playground
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl font-light leading-relaxed">
            Experience the math behind machine learning. Watch how different optimizers navigate the loss landscape, escape saddle points, and converge to the minimum.
          </p>

          {/* Interactive Hint */}
          <div className="text-sm font-mono text-teal-500/70 bg-slate-900/50 px-4 py-2 rounded border border-slate-700/50 backdrop-blur-sm">
            // Move your mouse to shift the global minimum
          </div>

          {/* Call to Action Container (pointer-events-auto makes it clickable) */}
          <div className="pt-8 pointer-events-auto flex flex-col sm:flex-row gap-4">
            <button 
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              className="group relative px-8 py-4 bg-teal-500 text-slate-900 font-bold text-lg rounded-lg overflow-hidden shadow-[0_0_20px_rgba(45,212,191,0.4)] transition-all hover:shadow-[0_0_30px_rgba(45,212,191,0.6)] hover:scale-105"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              <span className="relative flex items-center gap-2">
                Start Exploring
                <svg className={`w-5 h-5 transition-transform duration-300 ${isHovering ? 'translate-x-1' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
            
            <button className="px-8 py-4 bg-slate-800 text-teal-400 font-semibold text-lg rounded-lg border border-slate-700 hover:bg-slate-700 hover:border-teal-500/50 transition-all">
              View the Math
            </button>
          </div>

        </div>

        {/* Floating Optimizer Legend */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-6 text-sm font-mono text-slate-400 bg-slate-900/80 px-6 py-3 rounded-xl border border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#0f766e]"></span>
            <span>Vanilla GD</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#0ea5e9]"></span>
            <span>Momentum</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#2dd4bf]"></span>
            <span>Adam</span>
          </div>
        </div>
      </div>

      {/* Global Styles for custom animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}